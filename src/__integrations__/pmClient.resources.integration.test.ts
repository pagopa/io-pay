import { Server } from 'http';

import nodeFetch from 'node-fetch';
// Needed to patch the globals
import 'abort-controller/polyfill';
import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import { Millisecond } from 'italia-ts-commons/lib/units';
// import { fromNullable } from 'fp-ts/lib/Option';
import { createClient } from '../../generated/definitions/pagopa/client';
// eslint-disable-next-line no-underscore-dangle,functional/immutable-data
(window as any)._env_ = {
  IO_PAY_API_TIMEOUT: '10000',
  IO_PAY_PAYMENT_MANAGER_HOST: 'http://localhost:8080',
  IO_PAY_ENV: 'develop',
  IO_PAY_FUNCTIONS_HOST: 'http://localhost:7071',
};
import { retryingFetch } from '../utils/fetch';
import { getTermAndServices } from '../__mocks__/mocks';
import pm from './pm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any,functional/immutable-data
(global as any).fetch = nodeFetch;

describe('Endpoint approveTermsUsingPOST', () => {
  const PORT = process.env.PAYMENT_MANAGER_STUB_PORT ? parseInt(process.env.PAYMENT_MANAGER_STUB_PORT, 10) : 8080;
  const HOST = process.env.PAYMENT_MANAGER_STUB_HOST as string;

  // eslint-disable-next-line functional/no-let
  let pmServer: Server;

  // eslint-disable-next-line functional/no-let
  let pmServerTerminator: HttpTerminator;

  // eslint-disable-next-line functional/no-let
  let pmClient;

  beforeAll(async () => {
    // Start server
    pmServer = pm.listen(PORT, HOST);
    pmServerTerminator = createHttpTerminator({ server: pmServer });
    // Start client
    pmClient = createClient({
      baseUrl: `http://${HOST}:${PORT}`,
      fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
    });
  });

  afterAll(async () => {
    await pmServerTerminator.terminate();
  });

  it('should return 200 on getResourcesUsingGET response', async () => {
    expect(
      (await pmClient.getResourcesUsingGET({ language: 'it' })).fold(
        err => (err.pop()?.value as Response)?.status,
        myRes => myRes.status,
      ),
    ).toEqual(200);
  });

  it('should return terms and conditions text in IT language ', async () => {
    expect(
      (await pmClient.getResourcesUsingGET({ language: 'it' })).fold(
        err => (err.pop()?.value as Response)?.status,
        myRes => myRes.value?.data?.termsAndConditions,
      ),
    ).toEqual(getTermAndServices('it'));
  });

  it('should return terms and conditions text in EN language ', async () => {
    expect(
      (await pmClient.getResourcesUsingGET({ language: 'en' })).fold(
        err => (err.pop()?.value as Response)?.status,
        myRes => myRes.value?.data?.termsAndConditions,
      ),
    ).toEqual(getTermAndServices('en'));
  });

  it('should return terms and conditions text in IT language if query param language does not exist', async () => {
    expect(
      (await pmClient.getResourcesUsingGET({})).fold(
        err => (err.pop()?.value as Response).status,
        myRes => myRes.value?.data?.termsAndConditions,
      ),
    ).toEqual(getTermAndServices('it'));
  });
});
