import nodeFetch from 'node-fetch';

// eslint-disable-next-line @typescript-eslint/no-explicit-any,functional/immutable-data
(global as any).fetch = nodeFetch;

afterEach(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
});
