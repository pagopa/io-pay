import { MaxRetries } from 'italia-ts-commons/lib/tasks';
import { Millisecond } from 'italia-ts-commons/lib/units';
// // Needed to patch the globals
import 'abort-controller/polyfill';
import ServerMock from 'mock-http-server';
import nodeFetch from 'node-fetch';
import { retryingFetch, transientConfigurableFetch, ITransientFetchOpts } from '../fetch';

// eslint-disable-next-line @typescript-eslint/no-explicit-any,functional/immutable-data
(global as any).fetch = nodeFetch;

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

describe('transientConfigurableFetch', () => {
  const server = createServerMock();

  beforeEach(server.start);
  afterEach(server.stop);

  it('should reach max retries on transient error', async () => {
    // Set error 404 as transient error.
    const transientFetchOptions: ITransientFetchOpts = {
      numberOfRetries: 3,
      httpCodeMapToTransient: 404,
      delay: 10 as Millisecond,
      timeout: 1000 as Millisecond,
    };
    const fetchWithRetries = transientConfigurableFetch(fetch, transientFetchOptions);
    try {
      // start the fetch request
      await fetchWithRetries(longDelayUrl);
    } catch (e) {
      // fetch should abort with MaxRetries
      expect(server.requests().length).toEqual(3);
      expect(e).toEqual(MaxRetries);
    }
  });

  it('should retry once, when httpCodeMapToTransient is set as transient error', async () => {
    // Set error 401 as transient error, the server response is 404.
    // In this case no other retry are performed.
    const transientFetchOptions: ITransientFetchOpts = {
      numberOfRetries: 3,
      httpCodeMapToTransient: 401,
      delay: 10 as Millisecond,
      timeout: 1000 as Millisecond,
    };
    const fetchWithRetries = transientConfigurableFetch(fetch, transientFetchOptions);

    // start the fetch request
    await fetchWithRetries(longDelayUrl);

    expect(server.requests().length).toEqual(1);
  });

  it('should call global fetch maxRetries times', async () => {
    const mySpyGlobalFetch = jest.spyOn(global, 'fetch');

    // Set error 404 as transient error.
    const transientFetchOptions: ITransientFetchOpts = {
      numberOfRetries: 3,
      httpCodeMapToTransient: 404,
      delay: 10 as Millisecond,
      timeout: 1000 as Millisecond,
    };
    const fetchWithRetries = transientConfigurableFetch(fetch, transientFetchOptions);
    await expect(fetchWithRetries(longDelayUrl)).rejects.toEqual('max-retries');
    expect(mySpyGlobalFetch).toHaveBeenCalledTimes(3);
  });
});

describe('retryingFetch', () => {
  const server = createServerMock();

  beforeEach(server.start);
  afterEach(server.stop);
  it('should call global fetch at least once', async () => {
    const mySpyGlobalFetch = jest.spyOn(global, 'fetch');

    const fetchWithRetries = retryingFetch(fetch, 200 as Millisecond, 3);
    await expect(fetchWithRetries(longDelayUrl)).resolves.toHaveProperty('status');
    // when resolves global fetch gets called maxRetries + 1
    expect(mySpyGlobalFetch).toHaveBeenCalled();
  });
});
