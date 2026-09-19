import {
  sha256,
  ripemd160,
  secp256k1,
  decodePrivateKeyWif,
  binToHex,
  encodeCashAddress,
} from '@bitauth/libauth';
import { SignatureTemplate, Network } from 'cashscript';
import { NETWORK } from '../config.js';
import { AppError } from './errors.js';

const isMainnetLike = NETWORK === Network.MAINNET;

/**
 * Derives everything the app needs from a WIF private key: the signature
 * template used to sign transactions, and the CashTokens-aware address to
 * scan for UTXOs. Mirrors the CLI's getWallet.js.
 *
 * The raw WIF is never written to storage of any kind by this function or
 * its caller — it only ever lives in memory for the lifetime of the page,
 * and is discarded entirely when the wallet is "forgotten" or the tab closes.
 *
 * @param {string} wif
 * @throws {AppError} if the WIF is malformed, or doesn't match the configured network
 */
export async function deriveWalletFromWif(wif) {
  const trimmed = (wif || '').trim();
  if (!trimmed) {
    throw new AppError('invalid-wif', 'Enter a WIF private key.');
  }

  const decodedWif = decodePrivateKeyWif(trimmed, sha256);
  if (typeof decodedWif === 'string') {
    throw new AppError('invalid-wif', "That doesn't look like a valid WIF private key.");
  }

  const wifIsMainnet = decodedWif.type === 'mainnet' || decodedWif.type === 'mainnetUncompressed';
  if (wifIsMainnet !== isMainnetLike) {
    throw new AppError(
      'network-mismatch',
      `This key is for ${wifIsMainnet ? 'mainnet' : 'testnet'}, but the app is configured for ` +
        `"${NETWORK}". Double-check VITE_NETWORK before importing a key for the wrong network.`,
    );
  }

  let signatureTemplate;
  try {
    signatureTemplate = new SignatureTemplate(trimmed);
  } catch (cause) {
    throw new AppError('invalid-wif', "That doesn't look like a valid WIF private key.", { cause });
  }

  const pubKeyBin = secp256k1.derivePublicKeyCompressed(decodedWif.privateKey);
  const pubKeyHex = binToHex(pubKeyBin);
  const pubKeyHash = ripemd160.hash(sha256.hash(pubKeyBin));
  const { address } = encodeCashAddress({
    prefix: isMainnetLike ? 'bitcoincash' : 'bchtest',
    type: 'p2pkhWithTokens',
    payload: pubKeyHash,
  });

  return { address, signatureTemplate, pubKeyHex };
}
