import {Method} from 'axios';

export interface Endpoint {
    url: string;
    verb: Method;
}

export interface Parameter {
    pathParameters: { [key: string]: string };
    bodyParameters: any;
}

export interface RequestBody {
    endpoint: Endpoint;
    payloads: Parameter[];
}

interface EndpointLimit {
    count: number,
    queue: (() => Promise<void>)[]
}

export interface Limiter {
    [endpointUrl: string]: EndpointLimit;
}