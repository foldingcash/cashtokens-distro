import { decodeCashAddress, encodeCashAddress } from '@bitauth/libauth';
import { Network } from 'cashscript';
import { AppError } from './errors.js';

/** Networks offered in Settings. Chipnet is the usual place to test a distribution end to end. */
export const SUPPORTED_NETWORKS = [Network.MAINNET, Network.CHIPNET, Network.TESTNET4, Network.TESTNET3];

export function isSupportedNetwork(network) {
  return SUPPORTED_NETWORKS.includes(network);
}

/** The CashAddress prefix used on a network: mainnet is bitcoincash:, every test network is bchtest:. */
export function addressPrefix(network) {
  return network === Network.MAINNET ? 'bitcoincash' : 'bchtest';
}

const EXPLORER_TX_URLS = {
  [Network.MAINNET]: 'https://blockchair.com/bitcoin-cash/transaction/',
  [Network.CHIPNET]: 'https://cbch.loping.net/tx/',
};

/** A block explorer link for the transaction, or null if there isn't a known explorer for the network. */
export function explorerTxUrl(network, txid) {
  const base = EXPLORER_TX_URLS[network];
  return base ? `${base}${txid}` : null;
}

/**
 * Re-encodes a recipient address from the distribution API for the given
 * network. The API always returns mainnet addresses (sometimes without the
 * bitcoincash: prefix); on a test network the same key's address just uses
 * the bchtest: prefix instead.
 */
export function toNetworkAddress(address, network) {
  const withPrefix = address.includes(':') ? address : `bitcoincash:${address}`;
  const decoded = decodeCashAddress(withPrefix);
  if (typeof decoded === 'string') {
    throw new AppError(
      'invalid-recipient',
      `The distribution API returned an address that isn't a valid CashAddress: ${address}`,
    );
  }
  return encodeCashAddress({ prefix: addressPrefix(network), type: decoded.type, payload: decoded.payload }).address;
}
