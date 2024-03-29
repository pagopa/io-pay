import { Server } from 'http';

import nodeFetch from 'node-fetch';
// Needed to patch the globals
import 'abort-controller/polyfill';
import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import { Millisecond } from 'italia-ts-commons/lib/units';
import { fromNullable } from 'fp-ts/lib/Option';
import { createClient } from '../../generated/definitions/pagopa/client';
import { TypeEnum } from '../../generated/definitions/pagopa/Wallet';
// eslint-disable-next-line no-underscore-dangle,functional/immutable-data
(window as any)._env_ = {
  IO_PAY_API_TIMEOUT: '10000',
  IO_PAY_PAYMENT_MANAGER_HOST: 'http://localhost:8080',
  IO_PAY_ENV: 'develop',
  IO_PAY_FUNCTIONS_HOST: 'http://localhost:7071',
};
import { retryingFetch } from '../utils/fetch';
import pm from './pm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any,functional/immutable-data
(global as any).fetch = nodeFetch;

describe('Endpoint addWalletUsingPOST', () => {
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
      myRes => fromNullable(myRes.value.sessionToken).getOrElse('wrong_token'),
    );
  });

  afterAll(async () => {
    await pmServerTerminator.terminate();
  });

  it('should return 401 when the session token is wrong', async () => {
    expect(
      (
        await pmClient.addWalletUsingPOST({
          Bearer: 'Bearer wrong_token',
          walletRequest: {},
          language: 'it',
        })
      ).fold(
        err => (err.pop()?.value as Response).status,
        myRes => myRes.status,
      ),
    ).toEqual(401);
  });

  it('should return 500 when the walletRequest is empty', async () => {
    expect(
      (
        await pmClient.addWalletUsingPOST({
          Bearer: 'Bearer ' + sessionToken,
          walletRequest: {},
          language: 'it',
        })
      ).fold(
        err => (err.pop()?.value as Response).status,
        myRes => myRes.status,
      ),
    ).toEqual(500);
  });

  it('should return 422 when the walletRequest has an empty data entry', async () => {
    expect(
      (
        await pmClient.addWalletUsingPOST({
          Bearer: 'Bearer ' + sessionToken,
          walletRequest: {
            data: {},
          },
          language: 'it',
        })
      ).fold(
        err => (err.pop()?.value as Response).status,
        myRes => myRes.status,
      ),
    ).toEqual(422);
  });

  it('should return 200 when the walletRequest reflects the inputs collected during the payment flow', async () => {
    /* */

    const pmResponse = await pmClient.addWalletUsingPOST({
      Bearer: 'Bearer ' + sessionToken,
      walletRequest: {
        data: {
          type: TypeEnum.CREDIT_CARD,
          creditCard: {
            brand: 'VISA',
            expireMonth: '03',
            expireYear: '25',
            holder: 'Ciccio Mio',
            pan: '4024007182788397',
            securityCode: '666',
          },
          favourite: true,
          idPagamentoFromEC: '2a4afce9-40e5-4be7-885b-a5223ff73e9a', // needs to exist
        },
      },
      language: 'it',
    });

    expect(
      pmResponse.fold(
        err => (err.pop()?.value as Response).status,
        myRes => myRes.status,
      ),
    ).toEqual(200);

    expect(
      pmResponse.fold(
        () => undefined,
        myRes => myRes.value.data.creditCard.pan,
      ),
    ).toEqual('************8397');
  });

  it('should return 200 when the walletRequest contains the bare minimum fields', async () => {
    expect(
      (
        await pmClient.addWalletUsingPOST({
          Bearer: 'Bearer ' + sessionToken,
          walletRequest: {
            data: {
              type: TypeEnum.CREDIT_CARD,
              creditCard: {
                expireMonth: '03',
                expireYear: '25', // year must be encoded with two digits
                holder: 'Ciccio Mio',
                pan: '4024007182788397',
              },
              idPagamentoFromEC: '', // needs to exist
            },
          },
          language: 'it',
        })
      ).fold(
        err => (err.pop()?.value as Response).status,
        myRes => myRes.status,
      ),
    ).toEqual(200);
  });

  it('should return 422 when the credit card expiring year is encoded with 4 digits', async () => {
    expect(
      (
        await pmClient.addWalletUsingPOST({
          Bearer: 'Bearer ' + sessionToken,
          walletRequest: {
            data: {
              type: TypeEnum.CREDIT_CARD,
              creditCard: {
                expireMonth: '03',
                expireYear: '2025', // year must be encoded with two digits
                holder: 'Ciccio Mio',
                pan: '4024007182788397',
              },
              idPagamentoFromEC: '2a4afce9-40e5-4be7-885b-a5223ff73e9a', // needs to exist
            },
          },
          language: 'it',
        })
      ).fold(
        err => (err.pop()?.value as Response).status,
        () => undefined,
      ),
    ).toEqual(422);
  });
});
