import { Millisecond } from 'italia-ts-commons/lib/units';
import 'abort-controller/polyfill';
import nodeFetch from 'node-fetch';
// eslint-disable-next-line no-underscore-dangle,functional/immutable-data
(window as any)._env_ = {
  IO_PAY_API_TIMEOUT: '10000',
  IO_PAY_PAYMENT_MANAGER_HOST: 'http://localhost:8080',
  IO_PAY_ENV: 'develop',
  IO_PAY_FUNCTIONS_HOST: 'http://localhost:7071',
};
import { createClient } from '../../../generated/definitions/pagopa/client';
import { retryingFetch } from '../../utils/fetch';

// eslint-disable-next-line @typescript-eslint/no-explicit-any,functional/immutable-data
(global as any).fetch = nodeFetch;

describe('Endpoint resources test suite for UAT/PROD PM', () => {
  // Set the testing environment

  const PM_PORT = process.env.PAYMENT_MANAGER_PORT ? parseInt(process.env.PAYMENT_MANAGER_PORT, 10) : 1234;
  const PM_HOST_PROD = process.env.PAYMENT_MANAGER_HOST_PROD as string;
  const PM_HOST_UAT = process.env.PAYMENT_MANAGER_HOST_UAT as string;

  // eslint-disable-next-line functional/no-let
  let pmClientUAT;
  // eslint-disable-next-line functional/no-let
  let pmClientPROD;

  beforeAll(async () => {
    // Start clients

    pmClientUAT = createClient({
      baseUrl: `https://${PM_HOST_UAT}:${PM_PORT}`,
      fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
    });

    pmClientPROD = createClient({
      baseUrl: `https://${PM_HOST_PROD}:${PM_PORT}`,
      fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
    });

    expect(pmClientUAT).toBeTruthy();
    expect(pmClientPROD).toBeTruthy();
  });

  it('should return 200 on getResourcesUsingGET response', async () => {
    expect(
      (await pmClientUAT.getResourcesUsingGET({ language: 'it' })).fold(
        err => (err.pop()?.value as Response)?.status,
        myRes => myRes.status,
      ),
    ).toEqual(200);

    expect(
      (await pmClientPROD.getResourcesUsingGET({ language: 'it' })).fold(
        err => (err.pop()?.value as Response)?.status,
        myRes => myRes.status,
      ),
    ).toEqual(200);
  });

  it('should return terms and conditions that shall contains PagoPA S.p.A. ', async () => {
    expect(
      (await pmClientUAT.getResourcesUsingGET({ language: 'it' })).fold(
        err => (err.pop()?.value as Response)?.status,
        myRes => myRes.value?.data?.termsAndConditions,
      ),
    ).toContain('PagoPA S.p.A.');
    expect(
      (await pmClientPROD.getResourcesUsingGET({ language: 'it' })).fold(
        err => (err.pop()?.value as Response)?.status,
        myRes => myRes.value?.data?.termsAndConditions,
      ),
    ).toContain('PagoPA S.p.A.');
  });

  it('should return terms and conditions that shall NOT contains AgID', async () => {
    expect(
      (await pmClientUAT.getResourcesUsingGET({ language: 'it' })).fold(
        err => (err.pop()?.value as Response)?.status,
        myRes => myRes.value?.data?.termsAndConditions,
      ),
    ).not.toContain('AgID');
    expect(
      (await pmClientPROD.getResourcesUsingGET({ language: 'it' })).fold(
        err => (err.pop()?.value as Response)?.status,
        myRes => myRes.value?.data?.termsAndConditions,
      ),
    ).not.toContain('AgID');
  });
});
