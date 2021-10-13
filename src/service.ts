import axios from 'axios';
import {Endpoint, Limiter, Parameter} from './types';
import config from './config';


/*
* keys- urls
* values- request count made for this url and request queue
*/
const limiter: Limiter = {};

// Sent request if they wait in the queue or subtract one from the counter
function subtractFromLimitCount(endpointUrl: string) {
    setTimeout(async () => {
        if (limiter[endpointUrl].queue.length) {
            // Send new request from the queue
            const newRequest = limiter[endpointUrl].queue.shift();
            console.log('New request just sent from the queue!');
            await newRequest();
        } else {
            limiter[endpointUrl].count--;
        }
        // Wait the amount of time the rate limiter restricts
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

async function requestWithRetry(endpoint: Endpoint, payload: Parameter): Promise<string> {
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
        // Create key and initial value
        if (!limiter[endpoint.url]) {
            limiter[endpoint.url] = {count: 0, queue: []};
        }

        const results = new Array(payloads.length);
        // Map to array of functions, invoking them send the request
        let payloadRequestsFunctions = payloads.map((payload, index) =>
            () => requestWithRetry(endpoint, payload).then(value => {
                // After the promise returns update the value in the results array
                results[index] = value;
                count--;
                if (!count) {
                    resolve(results);
                }
            }));

        // Add requests to queue if there are too many
        if (limiter[endpoint.url].count + payloads.length > config.requestsLimit) {
            const availbleRequestsNumber = config.requestsLimit - limiter[endpoint.url].count;
            const queuedRequestsNumber = payloads.length - availbleRequestsNumber;
            const laterRequests = payloadRequestsFunctions.splice(availbleRequestsNumber, queuedRequestsNumber);
            limiter[endpoint.url].queue = limiter[endpoint.url].queue.concat(laterRequests);
        }

        console.log(`${payloadRequestsFunctions.length} requests on the way!`);

        limiter[endpoint.url].count += payloadRequestsFunctions.length;
        // Send initial requests
        payloadRequestsFunctions.forEach(fn => fn());
    });
}


