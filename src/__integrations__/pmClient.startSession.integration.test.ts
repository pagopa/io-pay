import { Server } from 'http';

import nodeFetch from 'node-fetch';
// Needed to patch the globals
import 'abort-controller/polyfill';
import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import { Millisecond } from 'italia-ts-commons/lib/units';
import { createClient } from '../../generated/definitions/pagopa/client';
import { retryingFetch } from '../utils/fetch';
import pm from './pm';
import { OsEnum } from '../../generated/definitions/pagopa/Device';

// eslint-disable-next-line @typescript-eslint/no-explicit-any,functional/immutable-data
(global as any).fetch = nodeFetch;

describe('Endpoint startSession', () => {
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

  it('should return 500 when the request is empty', async () => {
    expect(
      (
        await pmClient.startSessionUsingPOST({
          startSessionRequest: {},
        })
      ).fold(
        err => (err.pop()?.value as Response).status,
        myRes => myRes.status,
      ),
    ).toEqual(500);
  });

  it('should return 422 when the request has an empty data field', async () => {
    expect(
      (
        await pmClient.startSessionUsingPOST({
          startSessionRequest: {
            data: {},
          },
        })
      ).fold(
        err => (err.pop()?.value as Response).status,
        myRes => myRes.status,
      ),
    ).toEqual(422);
  });

  it("should return the same response when it's called with or without device", async () => {
    const pmResponse = await pmClient.startSessionUsingPOST({
      startSessionRequest: {
        data: {
          email: 'nunzia.ross@example.com',
          fiscalCode: 'UQNSFM56P12T733D', // seems to be ignored by PM
          idPayment: '12345', // seems to be ignored by PM
        },
      },
    });

    const pmResponseWithDevice = await pmClient.startSessionUsingPOST({
      startSessionRequest: {
        data: {
          email: 'nunzia.ross@example.com',
          idPayment: '12345', // seems to be ignored by PM
          device: {
            os: 'ANDROID' as OsEnum,
          },
        },
      },
    });

    expect(
      pmResponse.fold(
        () => undefined,
        myRes => myRes.value?.data?.user,
      ),
    ).toEqual(
      pmResponseWithDevice.fold(
        () => undefined,
        myRes => myRes.value?.data?.user,
      ),
    );
  });

  it('should return ANONYMOUS as user state when she feeds an email', async () => {
    expect(
      (
        await pmClient.startSessionUsingPOST({
          startSessionRequest: {
            data: {
              email: 'nunzia.ross@example.com',
              fiscalCode: 'UQNSFM56P12T733D', // seems to be ignored by PM
              idPayment: '12345', // seems to be ignored by PM
            },
          },
        })
      ).fold(
        () => undefined,
        myRes => myRes.value?.data?.user?.status,
      ),
    ).toEqual('ANONYMOUS');
  });

  it('should return a sessionToken when the user feeds an email', async () => {
    const pmResponse = await pmClient.startSessionUsingPOST({
      startSessionRequest: {
        data: {
          email: 'nunzia.ross@example.com',
          fiscalCode: 'UQNSFM56P12T733D', // seems to be ignored by PM
          idPayment: '12345', // seems to be ignored by PM
        },
      },
    });
    expect(
      pmResponse.fold(
        () => undefined,
        myRes => myRes.value?.data?.sessionToken,
      ),
    ).toMatch(/[\d\w]{128}/i);

    expect(
      pmResponse.fold(
        () => undefined,
        myRes => myRes.value?.data?.sessionToken,
      ),
    ).not.toMatch(/[\d\w]{129}/i);
  });

  it("should return 500 when the user doesn't feed an email", async () => {
    expect(
      (
        await pmClient.startSessionUsingPOST({
          startSessionRequest: {
            data: {
              fiscalCode: 'UQNSFM56P12T733D',
            },
          },
        })
      ).fold(
        () => undefined,
        myRes => myRes.status,
      ),
    ).toEqual(500);
  });
});
