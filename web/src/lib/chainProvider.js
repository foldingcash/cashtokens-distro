import { ElectrumNetworkProvider, TransactionBuilder } from 'cashscript';
import { DUST } from '../config.js';
import { AppError } from './errors.js';
import { toNetworkAddress } from './network.js';

const providers = new Map();

/** A shared ElectrumNetworkProvider per network. */
export function getProvider(network) {
  if (!providers.has(network)) {
    providers.set(network, new ElectrumNetworkProvider(network));
  }
  return providers.get(network);
}

/**
 * Fetches UTXOs for the wallet address and separates them into the
 * CashToken-bearing input and the (optional) plain-BCH funding input,
 * mirroring the CLI's validateInputs/getInputs. This app only supports the
 * same shape the CLI did — one token UTXO, plus at most one funding UTXO —
 * but fails with a clear error instead of silently picking one when there's
 * more than that, so nothing is ever sent from the wrong UTXO.
 */
export async function getWalletInputs(address, network) {
  const provider = getProvider(network);
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
 * The chain stores amounts in base units (`decimals` places); the API works
 * in whole tokens, so this must divide evenly.
 */
export function getDistroAmountFromTokenInput(tokenInput, decimals) {
  const scale = 10n ** BigInt(decimals);
  const amount = tokenInput.token.amount / scale;
  if (amount * scale !== tokenInput.token.amount) {
    throw new AppError(
      'precision',
      `The wallet holds ${tokenInput.token.amount} base units of the token, which does not divide evenly ` +
        `into whole tokens at ${decimals} decimals, so a distribution amount cannot be computed for it. ` +
        'Check the token decimals in Settings.',
    );
  }
  return amount;
}

/**
 * Converts each recipient's API amount (whole tokens, up to 8 decimals) into
 * on-chain base units. Rounding is by largest remainder so the base units
 * always sum to exactly `total`; with 8 decimals the API amounts are already
 * exact and this matches plain rounding. Recipients whose share rounds to
 * zero base units are dropped, since a token output can't carry 0 tokens.
 */
export function allocateTokenAmounts(distro, total, decimals) {
  const scale = 10 ** decimals;
  const shares = distro.map((folder) => {
    const exact = folder.amount * scale;
    const floor = Math.floor(exact);
    return { folder, tokenAmount: BigInt(floor), remainder: exact - floor };
  });

  const leftover = total - shares.reduce((sum, share) => sum + share.tokenAmount, 0n);
  if (leftover < 0n || leftover > BigInt(shares.length)) {
    throw new AppError(
      'distribution-mismatch',
      `The distribution API's amounts do not add up to the ${total} base units held in the wallet. ` +
        'Refusing to build the transaction.',
    );
  }
  [...shares]
    .sort((a, b) => b.remainder - a.remainder)
    .slice(0, Number(leftover))
    .forEach((share) => {
      share.tokenAmount += 1n;
    });

  const recipients = shares.filter((share) => share.tokenAmount > 0n);
  return { recipients, skippedCount: shares.length - recipients.length };
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
  network,
  signatureTemplate,
  tokenInput,
  fundInput,
  satoshis,
  distroCount,
  distro,
  decimals,
}) {
  const { recipients, skippedCount } = allocateTokenAmounts(
    distro.slice(0, distroCount),
    tokenInput.token.amount,
    decimals,
  );
  const recipientAddresses = recipients.map(({ folder }) => toNetworkAddress(folder.cashTokensAddress, network));
  const recipientCount = recipients.length;

  const minimumAmount = getMinimumSatoshisRequired(recipientCount);
  if (satoshis < minimumAmount) {
    throw new AppError(
      'insufficient-funds',
      `There are not enough satoshis in the wallet to cover this distribution. Need at least ` +
        `${minimumAmount} sats for dust, but the wallet only has ${satoshis} sats available.`,
      { minimumAmount, satoshis },
    );
  }

  const provider = getProvider(network);

  const build = (fee) => {
    const builder = new TransactionBuilder({ provider });
    builder.addInput(tokenInput, signatureTemplate.unlockP2PKH());
    if (fundInput) {
      builder.addInput(fundInput, signatureTemplate.unlockP2PKH());
    }

    builder.addOutput({
      to: address,
      amount: satoshis - BigInt(recipientCount) * DUST - fee,
    });

    let distributedTokens = 0n;
    recipients.forEach(({ tokenAmount }, index) => {
      builder.addOutput({
        to: recipientAddresses[index],
        amount: DUST,
        token: {
          amount: tokenAmount,
          category: tokenInput.token.category,
        },
      });
      distributedTokens += tokenAmount;
    });

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

  const changeSatoshis = satoshis - BigInt(recipientCount) * DUST - fee;

  return {
    transaction: finalBuilder,
    hex,
    fee,
    changeSatoshis,
    distributedTokens,
    recipientCount,
    skippedCount,
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
  // cashscript's FailedTransactionError appends a Bitauth URI to its message that embeds the private
  // key, so only its reason is ever shown.
  const message = cause?.reason || cause?.message || String(cause);
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
