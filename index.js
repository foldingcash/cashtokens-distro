import { ElectrumNetworkProvider, TransactionBuilder, Network } from 'cashscript';
import fs from 'fs/promises';

import { promptDate, promptInt, promptBool } from './prompt.js';
import getWallet from './getWallet.js';

import config from './config.json' assert { type: 'json' };

async function getDistriubtion(amount) {
    const startDate = promptDate('Start date? ');
    const endDate = promptDate('End date? ');

    console.log(`Going to create a distribution using:\n\tStart date: ${startDate}\n\tEnd date: ${endDate}\n\tAmount: ${amount}`);
    const shouldContinue = promptBool('Create distribution (no)? ', 'false')

    if (!shouldContinue) {
        throw Error('User ordered a stop');
    }

    const url = new URL('v1/GetDistro', config.DistroApi);
    url.searchParams.append('startDate', startDate);
    url.searchParams.append('endDate', endDate);
    url.searchParams.append('amount', amount);
    url.searchParams.append('includeFoldingUserTypes', 8);

    const serverResponse = await fetch(url);

    if (serverResponse.status != 200) {
        throw Error('Unable to continue, there was a problem getting the distribution', serverResponse);
    }

    const response = await serverResponse.json();

    if (response.distroCount <= 0 || response.distro.length === 0) {
        throw Error('Unable to continue, the received distribution has no users');
    }

    await fs.writeFile('FoldingAtHome_Distribution.json', response); // for book keeping

    return response;
}

function validateInputs(inputs) {
    if (inputs.length === 0) {
        throw Error('There are no inputs available');
    }

    if (!inputs.some(i => !!i.token)) {
        throw Error('There are no available inputs w/ tokens to send, send the tokens and transaction funds to wallet', address);
    }

    // only handle up to two inputs for now
    if (inputs.length > 2) {
        throw Error('Script needs to be enhanced to handle more than two inputs');
    }
}

function getInputs(inputs) {
    let tokenInput;
    let fundInput;
    let satoshis = 0n;

    for (let index = 0; index < inputs.length; index++) {
        const input = inputs[index];

        satoshis += input.satoshis;

        if (!!input.token) {
            tokenInput = input;
        } else {
            fundInput = input;
        }
    }

    return { tokenInput, fundInput, satoshis };
}

const Dust = 1000n;
const SatoshisPerByteTransactionFee = 1n;

async function main() {
    const { address, signatureTemplate } = await getWallet();
    const provider = new ElectrumNetworkProvider(config.Network);

    const inputs = await provider.getUtxos(address);
    validateInputs(inputs);

    const { tokenInput, fundInput, satoshis } = getInputs(inputs);

    const { distroCount, distro } = await getDistriubtion(tokenInput.token.amount);

    if (distroCount * Dust * 2 <= satoshis) { // Not a perfect calculation...
        throw Error('There is not enough satoshis to cover the distribution');
    }

    const builder = new TransactionBuilder({ provider });
    builder.addInput(tokenInput, signatureTemplate.unlockP2PKH());
    if (!!fundInput) {
        builder.addInput(fundInput, signatureTemplate.unlockP2PKH());
    }

    let changeSatoshis = satoshis;
    let distributedTokens = 0n;
    for (let index = 0; index < distroCount; index++) {
        const folder = distro[index];
        const tokenAmount = (folder.amount * 100000000); // A precision of eight decimals is returned in the distro response but the transaction builder needs the non-decimal amount
        builder.addOutput({
            to: folder.cashTokensAddress,
            amount: Dust,
            token: {
                amount: tokenAmount,
                category: tokenInput.token.category,
            }
        });
        changeSatoshis -= Dust;
        distributedTokens += tokenAmount;
    }

    if (distributedTokens !== tokenInput.token.amount) {
        throw Error('The total distribution amount does not equal the expected amount');
    }

    builder.addOutput({
        to: address,
        amount: changeSatoshis,
    });
}

try {
    await main();
} catch (error) {
    console.error('An unhandled exception was thrown', error.message);
    console.log(error);
}