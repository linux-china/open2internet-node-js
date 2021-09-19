const {RSocketClient, BufferEncoders, MESSAGE_RSOCKET_COMPOSITE_METADATA, APPLICATION_JSON} = require('rsocket-core');
const {Single} = require('rsocket-flowable');
const {ReactiveSocket, Payload} = require('rsocket-types/build/ReactiveSocketTypes');
const RSocketTcpClient = require('rsocket-tcp-client').default;
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

/** @typedef {Object} ConnectionOption
 * @property {String} [token]
 * @property {String} [domain]
 * @property {string} [url]
 */

/** @typedef {Object} InternetInfo
 * @property {String} eventType
 * @property {String} token
 * @property {String} uri
 */

/** @typedef {Object} HttpRequest
 * @property {Array} [body]
 * @property {Object} headers
 * @property {string} method
 * @property {string} path
 * @property {string} [query]
 * @property {String} requestUri
 */

/** @typedef {Object} HttpResponse
 * @property {Array} [body]
 * @property {Object} headers
 * @property {number} status
 */

class SymmetricResponder {

    /**
     * @param localUrl {string} local url
     */
    constructor(localUrl) {
        this.localUrl = localUrl;
    }

    /**
     * handle for incoming request_response
     * @param payload {Payload} request payload
     * @return {Single<Payload>}
     */
    requestResponse(payload) {
        /** @type {HttpRequest} */
        const httpRequest = JSON.parse(payload.data);
        return new Single(subscriber => {
            let requestUri = this.localUrl + httpRequest.path;
            if (httpRequest.query) {
                requestUri = requestUri + "?" + httpRequest.query;
            }
            console.log(`request uri: ${requestUri}`)
            let fetchOptions = {
                method: httpRequest.method,
                headers: httpRequest.headers
            }
            if (httpRequest.method === "POST" || httpRequest.method === "PUT") {
                fetchOptions.body = httpRequest.body;
            }
            fetch(requestUri, fetchOptions)
                .then(response => {
                    const headers = Object.fromEntries(response.headers.entries());
                    const status = response.status;
                    return response.arrayBuffer().then(arrayBuffer => {
                        return {
                            status,
                            headers,
                            body: Array.from(new Uint8Array(arrayBuffer))
                        }
                    });
                })
                .then(data => {
                    subscriber.onComplete({
                        data: convertToBuffer(data)
                    });
                })
                .catch(error => subscriber.onError(error));
            subscriber.onSubscribe();
        });
    }

    /**
     * handle for incoming metadata_push
     * @param payload {Payload} request payload
     * @return {Single<void>}
     */
    metadataPush(payload) {
        if (payload.metadata) {
            /** @type {InternetInfo} */
            const info = JSON.parse(payload.metadata);
            if (info.eventType === "app.exposed") {
                console.log("Connected Status: online");
                console.log(`Internet URL: ${info.uri}`);
                console.log(`Local URL: ${this.localUrl}`);
            }
        }
        return new Single(subscriber => {
            subscriber.onSubscribe();
            subscriber.onComplete();
        });
    }
}


/**
 * connect to RSocket Server
 * @param url {URL} websocket URL
 * @param responder {object} websocket URL
 * @param [options] {ConnectionOption}
 * @return {Single<ReactiveSocket>}
 */
function connectRSocketServer(url, responder, options) {
    let data = {};
    if (options && options.domain && options.token) {
        data.domain = options.domain;
        data.token = options.token;
    }
    const client = new RSocketClient({
        setup: {
            keepAlive: 1000000, // avoid sending during test
            lifetime: 100000,
            dataMimeType: APPLICATION_JSON.string,
            metadataMimeType: MESSAGE_RSOCKET_COMPOSITE_METADATA.string,
            payload: {
                data: convertToBuffer(data)
            }
        },
        transport: new RSocketTcpClient({host: url.hostname, port: url.port}, BufferEncoders),
        responder: responder,
    });
    return client.connect();
}

/**
 * RSocket instance with extra methods
 * @type {Single<ReactiveSocket>}
 */

/**
 * @param data {string|Buffer|Object} text/json data or json data
 * @return {Buffer|null}
 */
function convertToBuffer(data) {
    if (data === null) {
        return null;
    } else if (Buffer.isBuffer(data)) {
        return data;
    } else if (typeof data === 'string' || data instanceof String) {
        return Buffer.from(data);
    } else {
        return Buffer.from(JSON.stringify(data));
    }
}


/**
 *
 * @param {string} localUrl  local http server url
 * @param [options] {ConnectionOption} connection options
 * @return {Promise<ReactiveSocket>}
 */
function open2internet(localUrl, options) {
    let rsocketUrl = "tcp://microservices.club:42252";
    if (options && options.url) {
        rsocketUrl = options.url
    }
    const responder = new SymmetricResponder(localUrl);
    let reactiveSocketSingle = connectRSocketServer(new URL(rsocketUrl), responder, options);
    return new Promise((resolve, reject) => {
        reactiveSocketSingle.subscribe({
            onComplete: data => resolve(data),
            onError: error => reject(error),
            onSubscribe: cancel => {
            },
        });
    });
}

module.exports = open2internet;
