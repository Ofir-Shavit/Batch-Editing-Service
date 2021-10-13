import axios from 'axios';
import {Endpoint, Limiter, Parameter} from './types';
import config from './config';


// Object that stores the endpoints as keys and the number of requests sent as a value
const limiter: Limiter = {};

function subtractFromLimitCount(endpointUrl: string) {
    setTimeout(async () => {
        if (limiter[endpointUrl].queue.length) {
            const newRequest = limiter[endpointUrl].queue.shift();
            console.log('New request just sent from the queue!');
            await newRequest();
        } else {
            limiter[endpointUrl].count--;
        }
    }, config.timeLimit);
}

async function request(endpoint: Endpoint, payload: Parameter): Promise<string> {

    // Using path parameters
    if (payload.pathParameters) {
        for (const pathParameter of Object.keys(payload.pathParameters)) {
            endpoint.url.replace(`{${pathParameter}}`, payload.pathParameters[pathParameter]);
        }
    }

    try {
        await axios({
            method: endpoint.verb,
            url: endpoint.url,
            data: payload.bodyParameters
        });

        subtractFromLimitCount(endpoint.url);

        console.log('Request succeeded');
        return 'success';
    } catch (e) {
        console.log(`Request failed with status code ${e.response.status}`);
        return 'fail';
    }
}

export async function requestWithRetry(endpoint: Endpoint, payload: Parameter): Promise<string> {
    let result = await request(endpoint, payload);
    if (result === 'fail') {
        return request(endpoint, payload);
    } else {
        return result;
    }
}

export async function batchRequests(endpoint: Endpoint, payloads: Parameter[]) {
    return new Promise<string[]>((resolve, reject) => {
        let count = payloads.length;

        if (!limiter[endpoint.url]) {
            limiter[endpoint.url] = {count: 0, queue: []};
        }

        const results = new Array(payloads.length);

        let payloadRequestsFunctions = payloads.map((payload, index) =>
            () => requestWithRetry(endpoint, payload).then(value => {
                results[index] = value;
                count--;
                if (!count) {
                    resolve(results);
                }
            }));


        if (limiter[endpoint.url].count + payloads.length > config.requestsLimit) {
            const availbleRequestsNumber = config.requestsLimit - limiter[endpoint.url].count;
            const queuedRequestsNumber = payloads.length - availbleRequestsNumber;
            const laterRequests = payloadRequestsFunctions.splice(availbleRequestsNumber, queuedRequestsNumber);
            limiter[endpoint.url].queue = limiter[endpoint.url].queue.concat(laterRequests);
        }

        console.log(`${payloadRequestsFunctions.length} requests on the way!`);

        limiter[endpoint.url].count += payloadRequestsFunctions.length;
        payloadRequestsFunctions.forEach(fn => fn());
    });
}


