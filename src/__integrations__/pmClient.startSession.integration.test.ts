import { Server } from 'http';

import nodeFetch from 'node-fetch';
// Needed to patch the globals
import 'abort-controller/polyfill';
import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import { Millisecond } from 'italia-ts-commons/lib/units';
import { createClient, Client } from '../../generated/definitions/pagopa/client';
// eslint-disable-next-line no-underscore-dangle,functional/immutable-data
(window as any)._env_ = {
  IO_PAY_API_TIMEOUT: '10000',
  IO_PAY_PAYMENT_MANAGER_HOST: 'http://localhost:8080',
  IO_PAY_ENV: 'develop',
  IO_PAY_FUNCTIONS_HOST: 'http://localhost:7071',
};
import { retryingFetch } from '../utils/fetch';
import { OsEnum } from '../../generated/definitions/pagopa/Device';
import pm from './pm';

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
  let pmClient: Client;

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

  it("should return the same notificationEmail when it's called with or without device", async () => {
    const pmResponse = await pmClient.startSessionUsingPOST({
      startSessionRequest: {
        data: {
          email: 'nunzia.ross@example.com',
          fiscalCode: 'UQNSFM56P12T733D',
          idPayment: '12345',
        },
      },
    });

    const pmResponseWithDevice = await pmClient.startSessionUsingPOST({
      startSessionRequest: {
        data: {
          email: 'nunzia.ross@example.com',
          idPayment: '12345',
          fiscalCode: 'UQNSFM56P12T733D',
          device: {
            os: 'ANDROID' as OsEnum,
          },
        },
      },
    });

    expect(
      pmResponse.fold(
        () => undefined,
        myRes => myRes.value?.user?.notificationEmail,
      ),
    ).toEqual(
      pmResponseWithDevice.fold(
        () => undefined,
        myRes => myRes.value?.user?.notificationEmail,
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
        myRes => myRes.value?.user?.status,
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
        myRes => myRes.value?.sessionToken,
      ),
    ).toMatch(/[\d\w]{128}/i);

    expect(
      pmResponse.fold(
        () => undefined,
        myRes => myRes.value?.sessionToken,
      ),
    ).not.toMatch(/[\d\w]{129}/i);
  });
});
