import { AbortableFetch, retriableFetch, setFetchTimeout, toFetch } from 'italia-ts-commons/lib/fetch';
import { MaxRetries, withRetries } from 'italia-ts-commons/lib/tasks';
import { Millisecond } from 'italia-ts-commons/lib/units';

import ServerMock from 'mock-http-server';
import nodeFetch from 'node-fetch';
import { retryLogicForTransientResponseError, defaultRetryingFetch } from '../fetch';

const {
  AbortController,
  // eslint-disable-next-line @typescript-eslint/no-var-requires
} = require('abortcontroller-polyfill/dist/cjs-ponyfill');

//
// We need to override the global fetch and AbortController to make the tests
// compatible with node-fetch
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any,functional/immutable-data
(global as any).fetch = nodeFetch;
// eslint-disable-next-line @typescript-eslint/no-explicit-any,functional/immutable-data
(global as any).AbortController = AbortController;

const TEST_PATH = 'transient-error';
const TEST_HOST = 'localhost';
const TEST_PORT = 40000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createServerMock(): any {
  const server = new ServerMock({ host: TEST_HOST, port: TEST_PORT }, undefined);

  server.on({
    method: 'GET',
    path: `/${TEST_PATH}`,
    reply: {
      status: 404,
    },
  });

  return server;
}

const longDelayUrl = `http://${TEST_HOST}:${TEST_PORT}/${TEST_PATH}`;

export const transientConfigurableFetch = (retries: number, httpErrorCode: number) => {
  const delay = 10 as Millisecond;
  const timeout: Millisecond = 1000 as Millisecond;
  const abortableFetch = AbortableFetch(fetch);
  const timeoutFetch = toFetch(setFetchTimeout(timeout, abortableFetch));
  const constantBackoff = () => delay;
  const retryLogic = withRetries<Error, Response>(retries, constantBackoff);
  // makes the retry logic map specific http error code to transient errors (by default only
  // timeouts are transient)
  const retryWithTransientError = retryLogicForTransientResponseError(_ => _.status === httpErrorCode, retryLogic);
  return retriableFetch(retryWithTransientError)(timeoutFetch as typeof fetch);
};

describe('Fetch with transient error', () => {
  const server = createServerMock();

  beforeEach(server.start);
  afterEach(server.stop);

  it('Fetch should reach max retry on transient error', async () => {
    // Set error 404 as transient error.
    const fetchWithRetries = transientConfigurableFetch(3, 404);
    try {
      // start the fetch request
      await fetchWithRetries(longDelayUrl);
    } catch (e) {
      // fetch should abort with MaxRetries
      expect(server.requests().length).toEqual(3);
      expect(e).toEqual(MaxRetries);
    }
  });

  it('Fetch one time retry', async () => {
    // Set error 401 as transient error, the server response is 404.
    // In this case no other retry are performed.
    const fetchWithRetries = transientConfigurableFetch(3, 401);

    // start the fetch request
    await fetchWithRetries(longDelayUrl);

    expect(server.requests().length).toEqual(1);
  });

  it('When calling transientConfigurableFetch should call global fetch maxRetries times', async () => {
    // After a custom fetch instantiation, the 'global' var is guaranteed to have a fetch field
    // which points to the whatwg.fetch. In this test suite the global fetch is overridden with
    // node fetch. Despite the override it should be called a number of times equal to maxRetries
    const mySpyGlobalFetch = jest.spyOn(global, 'fetch');

    // Set error 404 as transient error.
    const fetchWithRetries = transientConfigurableFetch(3, 404);
    await expect(fetchWithRetries(longDelayUrl)).rejects.toEqual('max-retries');
    expect(mySpyGlobalFetch).toHaveBeenCalledTimes(3);
  });

  it('Whean calling defaultRetryingFetch should call global fetch at least once', async () => {
    const mySpyGlobalFetch = jest.spyOn(global, 'fetch');

    const fetchWithRetries = defaultRetryingFetch(200 as Millisecond, 3);
    await expect(fetchWithRetries(longDelayUrl)).resolves.toHaveProperty('status');
    expect(mySpyGlobalFetch).toHaveBeenCalled();
  });
});
