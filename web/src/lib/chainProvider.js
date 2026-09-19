import { ElectrumNetworkProvider, TransactionBuilder } from 'cashscript';
import { NETWORK, DUST } from '../config.js';
import { AppError } from './errors.js';

let providerInstance;

/** A single shared ElectrumNetworkProvider for the configured network. */
export function getProvider() {
  if (!providerInstance) {
    providerInstance = new ElectrumNetworkProvider(NETWORK);
  }
  return providerInstance;
}

/**
 * Fetches UTXOs for the wallet address and separates them into the
 * CashToken-bearing input and the (optional) plain-BCH funding input,
 * mirroring the CLI's validateInputs/getInputs. This app only supports the
 * same shape the CLI did — one token UTXO, plus at most one funding UTXO —
 * but fails with a clear error instead of silently picking one when there's
 * more than that, so nothing is ever sent from the wrong UTXO.
 */
export async function getWalletInputs(address) {
  const provider = getProvider();
  let utxos;
  try {
    utxos = await provider.getUtxos(address);
  } catch (cause) {
    throw new AppError(
      'network-provider',
      'Could not fetch UTXOs from the Electrum server. Check your connection and try again.',
      { cause },
    );
  }

  if (utxos.length === 0) {
    throw new AppError(
      'no-utxos',
      `No UTXOs were found for ${address}. Send the tokens (and some BCH for fees) to this address first.`,
    );
  }

  const tokenInputs = utxos.filter((u) => !!u.token);
  const fundInputs = utxos.filter((u) => !u.token);

  if (tokenInputs.length === 0) {
    throw new AppError(
      'no-token-input',
      `No CashToken UTXOs were found at ${address}. Send the tokens to be distributed to this address first.`,
    );
  }
  if (tokenInputs.length > 1) {
    throw new AppError(
      'multiple-token-inputs',
      'More than one CashToken UTXO was found at this address. Consolidate them into a single UTXO ' +
        'before distributing — this app only handles one token input at a time.',
    );
  }
  if (fundInputs.length > 1) {
    throw new AppError(
      'multiple-fund-inputs',
      'More than one plain-BCH UTXO was found in addition to the token UTXO. Consolidate your funding ' +
        'UTXOs into one before distributing.',
    );
  }

  const tokenInput = tokenInputs[0];
  const fundInput = fundInputs[0];
  const satoshis = tokenInput.satoshis + (fundInput ? fundInput.satoshis : 0n);

  return { tokenInput, fundInput, satoshis, utxos };
}

/**
 * The whole-token distribution amount available from the token input.
 * The chain stores amounts with 8 decimal places; the API works in whole
 * tokens, so this must divide evenly.
 */
export function getDistroAmountFromTokenInput(tokenInput) {
  const amount = tokenInput.token.amount / 100000000n;
  if (amount * 100000000n !== tokenInput.token.amount) {
    throw new AppError(
      'precision',
      'The token amount held in the wallet does not divide evenly into whole tokens, so a distribution ' +
        'amount cannot be computed for it.',
    );
  }
  return amount;
}

/** The minimum satoshis required to cover dust on every output, matching the CLI's rough check. */
export function getMinimumSatoshisRequired(distroCount) {
  return BigInt(distroCount) * DUST * 2n;
}

/**
 * Builds (but does not broadcast) the distribution transaction, running the
 * same two-pass fee estimation the CLI used: build once with a placeholder
 * fee to learn the transaction's byte size, then rebuild with a fee of
 * roughly 1 satoshi/byte.
 *
 * Returns the TransactionBuilder instance (which itself exposes `.send()`)
 * along with the numbers needed to show the user a review screen.
 */
export async function prepareDistributionTransaction({
  address,
  signatureTemplate,
  tokenInput,
  fundInput,
  satoshis,
  distroCount,
  distro,
}) {
  const minimumAmount = getMinimumSatoshisRequired(distroCount);
  if (satoshis < minimumAmount) {
    throw new AppError(
      'insufficient-funds',
      `There are not enough satoshis in the wallet to cover this distribution. Need at least ` +
        `${minimumAmount} sats for dust, but the wallet only has ${satoshis} sats available.`,
      { minimumAmount, satoshis },
    );
  }

  const provider = getProvider();

  const build = (fee) => {
    const builder = new TransactionBuilder({ provider });
    builder.addInput(tokenInput, signatureTemplate.unlockP2PKH());
    if (fundInput) {
      builder.addInput(fundInput, signatureTemplate.unlockP2PKH());
    }

    builder.addOutput({
      to: address,
      amount: satoshis - BigInt(distroCount) * DUST - fee,
    });

    let distributedTokens = 0n;
    for (let index = 0; index < distroCount; index += 1) {
      const folder = distro[index];
      // The API returns amounts with up to 8 decimals of precision; the chain needs the
      // non-decimal integer amount.
      const tokenAmount = BigInt(Math.round(folder.amount * 100000000));
      builder.addOutput({
        to: folder.cashTokensAddress.startsWith('bitcoincash:')
          ? folder.cashTokensAddress
          : `bitcoincash:${folder.cashTokensAddress}`,
        amount: DUST,
        token: {
          amount: tokenAmount,
          category: tokenInput.token.category,
        },
      });
      distributedTokens += tokenAmount;
    }

    if (distributedTokens !== tokenInput.token.amount) {
      throw new AppError(
        'distribution-mismatch',
        `The total distribution amount (${distributedTokens}) does not equal the token amount in the ` +
          `wallet (${tokenInput.token.amount}). Refusing to build the transaction.`,
      );
    }

    return { builder, distributedTokens };
  };

  // Pass 1: placeholder fee, just to learn the size.
  const { builder: sizingBuilder } = build(DUST * 2n);
  const sizingHex = await sizingBuilder.build();
  const transactionBytes = BigInt(sizingHex.length) / 2n;
  const fee = transactionBytes + 1n;

  // Pass 2: the real fee.
  const { builder: finalBuilder, distributedTokens } = build(fee);
  const hex = await finalBuilder.build();

  const changeSatoshis = satoshis - BigInt(distroCount) * DUST - fee;

  return {
    transaction: finalBuilder,
    hex,
    fee,
    changeSatoshis,
    distributedTokens,
  };
}

/** Broadcasts a previously-prepared transaction. Throws AppError on any failure. */
export async function sendDistributionTransaction(transaction) {
  try {
    const result = await transaction.send();
    return result;
  } catch (cause) {
    throw new AppError('broadcast', describeBroadcastError(cause), { cause });
  }
}

function describeBroadcastError(cause) {
  const message = cause?.message || String(cause);
  if (/missing.?inputs|bad-txns-inputs-missingorspent|bad-txns-inputs-spent/i.test(message)) {
    return 'The wallet’s UTXOs have already been spent (perhaps by a previous run). Refresh and try again.';
  }
  if (/txn-mempool-conflict/i.test(message)) {
    return 'This transaction conflicts with another one already in the mempool. Refresh and try again.';
  }
  if (/transaction already in block chain|txn-already-known|txn-already-in-mempool/i.test(message)) {
    return 'This exact transaction was already broadcast.';
  }
  return `The network rejected the transaction: ${message}`;
}
