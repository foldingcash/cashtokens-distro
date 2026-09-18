import {
    instantiateSecp256k1,
    instantiateRipemd160,
    instantiateSha256,
    decodePrivateKeyWif,
    binToHex,
    encodeCashAddress,
  } from '@bitauth/libauth';
  import { SignatureTemplate, Network } from 'cashscript';
  
  import config from './config.json' with { type: 'json' };
  import wallet from './wallet.json' with { type: 'json' };
  
  export default async function getWallet() {
    const secp256k1 = await instantiateSecp256k1();
    const ripemd160 = await instantiateRipemd160();
    const sha256 = await instantiateSha256();
  
    const privateKey = wallet.PrivateKey;
    const signatureTemplate = new SignatureTemplate(privateKey);
  
    const decodedWif = decodePrivateKeyWif(privateKey);
    const pubKeyBin = secp256k1.derivePublicKeyCompressed(decodedWif.privateKey);
    const pubKeyHex = binToHex(pubKeyBin);
    const pubKeyHash = ripemd160.hash(sha256.hash(pubKeyBin));
    const address = encodeCashAddress({ prefix: config.Network === Network.MAINNET ? 'bitcoincash' : 'bchtest', type: 'p2pkhWithTokens', payload: pubKeyHash }).address;
    return { privateKey, signatureTemplate, pubKeyBin, pubKeyHex, pubKeyHash, address };
  }