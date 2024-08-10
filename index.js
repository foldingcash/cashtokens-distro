import http from 'http';

import { promptDate, promptInt, promptBool } from './prompt.js';

import config from './config.json' assert { type: 'json' };

async function main() {
    const startDate = promptDate('Start date? ');
    const endDate = promptDate('End date? ');
    const amount = promptInt('Amount? ');

    console.log(`Going to create a distribution using:\n\tStart date: ${startDate}\n\tEnd date: ${endDate}\n\tAmount: ${amount}`);
    const shouldContinue = promptBool('Create distribution (no)? ', 'false')

    if(!shouldContinue) {
        return;
    }

    const url = new URL('v1/GetDistro', config.DistroApi); // `http://tenaciousm/v1/GetDistro?startDate=${startDate}&endDate=${endDate}&amount=${amount}&includeFoldingUserTypes=8`
    url.searchParams.append('startDate', startDate);
    url.searchParams.append('endDate', endDate);
    url.searchParams.append('amount', amount);
    url.searchParams.append('includeFoldingUserTypes', 8);

    const serverResponse = await fetch(url);

    if(serverResponse.status != 200) {
        throw Error('Unable to continue, there was a problem getting the distribution', serverResponse);
    }

    const response = await serverResponse.json();
    
    if(response.distroCount <= 0 || response.distro.length === 0) {
        throw Error('Unable to continue, the received distribution has no users');
    }

    // TODO send the distribution out
}

try {
    await main();
} catch(error) {
    console.error('An unhandled exception was thrown', error.message);
    console.log(error);
}