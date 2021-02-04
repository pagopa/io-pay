import { Server } from 'http';

import nodeFetch from 'node-fetch';
// Needed to patch the globals
import 'abort-controller/polyfill';
import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import { Millisecond } from 'italia-ts-commons/lib/units';
import { fromNullable } from 'fp-ts/lib/Option';
import { createClient } from '../../generated/definitions/pagopa/client';
// import { TypeEnum } from '../../generated/definitions/pagopa/Wallet';
import { retryingFetch } from '../utils/fetch';
import {
  approveTermsResponseAccepted,
  approveTermsResponseRefused,
  httpResponseStatus,
  sessionTokenInternalException,
  sessionTokenUnprocessableEntity,
} from '../__mocks__/mocks';
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

  // eslint-disable-next-line functional/no-let
  let sessionToken: string;

  beforeAll(async () => {
    // Start server
    pmServer = pm.listen(PORT, HOST);
    pmServerTerminator = createHttpTerminator({ server: pmServer });
    // Start client
    pmClient = createClient({
      baseUrl: `http://${HOST}:${PORT}`,
      fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
    });

    sessionToken = (
      await pmClient.startSessionUsingPOST({
        startSessionRequest: {
          data: {
            email: 'pippo@pluto.com',
            fiscalCode: 'HBBJUU78U89R556T',
            idPayment: 'c8860a83-c1e1-4cff-8a6d-e393b019a922',
          },
        },
      })
    ).fold(
      () => 'wrong_token',
      myRes => fromNullable(myRes.value.data.sessionToken).getOrElse('wrong_token'),
    );
  });

  afterAll(async () => {
    await pmServerTerminator.terminate();
  });

  it('should return 200 when the approveTermsRequest contains correct data', async () => {
    expect(
      (
        await pmClient.approveTermsUsingPOST({
          Bearer: sessionToken,
          approveTermsRequest: {
            data: {
              terms: true,
              privacy: true,
            },
          },
        })
      ).fold(
        err => (err.pop()?.value as Response).status,
        myRes => myRes.status,
      ),
    ).toEqual(200);
  });

  it('should return approveTermsResponse accepted with terms and privacy set both to true', async () => {
    expect(
      (
        await pmClient.approveTermsUsingPOST({
          Bearer: sessionToken,
          approveTermsRequest: {
            data: {
              terms: true,
              privacy: true,
            },
          },
        })
      ).fold(
        err => (err.pop()?.value as Response).status,
        myRes => myRes.value?.data,
      ),
    ).toEqual(approveTermsResponseAccepted);
  });

  it('should return approveTermsResponse refused if terms is set to false ', async () => {
    expect(
      (
        await pmClient.approveTermsUsingPOST({
          Bearer: sessionToken,
          approveTermsRequest: {
            data: {
              terms: false,
              privacy: true,
            },
          },
        })
      ).fold(
        err => (err.pop()?.value as Response).status,
        myRes => myRes.value?.data,
      ),
    ).toEqual(approveTermsResponseRefused);
  });

  it('should return approveTermsResponse refused if privacy is set to false ', async () => {
    expect(
      (
        await pmClient.approveTermsUsingPOST({
          Bearer: sessionToken,
          approveTermsRequest: {
            data: {
              terms: true,
              privacy: false,
            },
          },
        })
      ).fold(
        err => (err.pop()?.value as Response).status,
        myRes => myRes.value?.data,
      ),
    ).toEqual(approveTermsResponseRefused);
  });

  it('should return 401 when the session token is wrong', async () => {
    expect(
      (
        await pmClient.approveTermsUsingPOST({
          Bearer: 'not_correct_token',
          approveTermsRequest: {
            data: {
              terms: true,
              privacy: false,
            },
          },
        })
      ).fold(
        err => (err.pop()?.value as Response).status,
        myRes => myRes.status,
      ),
    ).toEqual(httpResponseStatus.HTTP_401);
  });

  it('should return 401 when the session token is empty', async () => {
    expect(
      (
        await pmClient.approveTermsUsingPOST({
          Bearer: '',
          approveTermsRequest: {
            data: {
              terms: true,
              privacy: false,
            },
          },
        })
      ).fold(
        err => (err.pop()?.value as Response).status,
        myRes => myRes.status,
      ),
    ).toEqual(httpResponseStatus.HTTP_401);
  });

  it('should return 422 when the PM raise RestApiUnprocessableEntityException', async () => {
    expect(
      (
        await pmClient.approveTermsUsingPOST({
          Bearer: sessionTokenUnprocessableEntity,
          approveTermsRequest: {
            data: {
              terms: true,
              privacy: false,
            },
          },
        })
      ).fold(
        err => (err.pop()?.value as Response).status,
        myRes => myRes.status,
      ),
    ).toEqual(httpResponseStatus.HTTP_422);
  });

  it('should return 500 when the PM raise RestAPIInternalException', async () => {
    expect(
      (
        await pmClient.approveTermsUsingPOST({
          Bearer: sessionTokenInternalException,
          approveTermsRequest: {
            data: {
              terms: true,
              privacy: false,
            },
          },
        })
      ).fold(
        err => (err.pop()?.value as Response).status,
        myRes => myRes.status,
      ),
    ).toEqual(httpResponseStatus.HTTP_500);
  });
});
