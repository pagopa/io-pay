import { Server } from 'http';

import { fromNullable } from 'fp-ts/lib/Option';
import 'abort-controller/polyfill';
import nodeFetch from 'node-fetch';
import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import { Millisecond } from 'italia-ts-commons/lib/units';

import * as myFake from 'faker/locale/it';
import { identity } from 'fp-ts/lib/function';
import { createClient, Client } from '../../generated/definitions/pagopa/client';
// eslint-disable-next-line no-underscore-dangle,functional/immutable-data
(window as any)._env_ = {
  IO_PAY_API_TIMEOUT: '10000',
  IO_PAY_PAYMENT_MANAGER_HOST: 'http://localhost:8080',
  IO_PAY_ENV: 'develop',
  IO_PAY_FUNCTIONS_HOST: 'http://localhost:7071',
};
import { retryingFetch } from '../utils/fetch';
import { PspListResponse } from '../../generated/definitions/pagopa/PspListResponse';
import { WalletResponse } from '../../generated/definitions/pagopa/WalletResponse';
import pm from './pm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any,functional/immutable-data
(global as any).fetch = nodeFetch;

describe('Endpoint PUT wallet of PM', () => {
  // Set the testing environment
  const PORT = process.env.PAYMENT_MANAGER_STUB_PORT ? parseInt(process.env.PAYMENT_MANAGER_STUB_PORT, 10) : 8080;
  const HOST = process.env.PAYMENT_MANAGER_STUB_HOST as string;
  // eslint-disable-next-line functional/no-let
  let pmClient: Client;

  // eslint-disable-next-line functional/no-let
  let pmServer: Server;

  // eslint-disable-next-line functional/no-let
  let pmServerTerminator: HttpTerminator;

  const goodIdPayment = 'c69eae39-7de1-40a5-86aa-2bb1b17c7b80';
  const mySessionToken = myFake.random.alphaNumeric(128);
  const goodIdWallet = 100;

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

  afterAll(async () => await pmServerTerminator.terminate());

  it('should return modified wallet when the default psp is updated', async () => {
    // GET Psps list
    const psps = (
      await pmClient.getPspListUsingGET({
        Bearer: `Bearer ${mySessionToken}`,
        paymentType: 'CREDIT_CARD',
        isList: true,
        idWallet: goodIdWallet,
        language: 'it',
        idPayment: goodIdPayment,
      })
    ).fold(
      () => fail(),
      res => PspListResponse.decode(res.value).fold(() => fail(), identity),
    );

    const pspsList = fromNullable(psps.data?.pspList).getOrElse([]);

    const updateWalletResponse =
      pspsList.length > 1 // PSP can be changed
        ? (
            await pmClient.updateWalletUsingPUT({
              Bearer: `Bearer ${mySessionToken}`,
              id: goodIdWallet,
              walletRequest: {
                data: {
                  idPsp: 22, // Just set the ID of the new PSP
                },
              },
            })
          ).fold(
            () => undefined,
            res => WalletResponse.decode(res.value).getOrElse({ data: {} }),
          )
        : { data: {} };

    expect(updateWalletResponse?.data.idPsp).toEqual(22);
    expect(updateWalletResponse?.data.psp?.serviceAvailability).toEqual('NEXI');
  });

  it('should return 401 when the Bearer Token is wrong', async () => {
    const updateWalletResponse = (
      await pmClient.updateWalletUsingPUT({
        Bearer: 'Bearer wrong_token',
        id: goodIdWallet,
        walletRequest: {
          data: {
            idPsp: 22,
          },
        },
      })
    ).fold(
      () => undefined,
      res => res.status,
    );

    expect(updateWalletResponse).toEqual(401);
  });

  it('should return 422 when the idWallet is wrong', async () => {
    const updateWalletResponse = (
      await pmClient.updateWalletUsingPUT({
        Bearer: `Bearer ${mySessionToken}`,
        id: -1,
        walletRequest: {
          data: {
            idPsp: 22,
          },
        },
      })
    ).fold(
      err => (err.pop()?.value as Response).status,
      () => undefined,
    );

    expect(updateWalletResponse).toEqual(422);
  });

  it('should return 422 when the idPsp is wrong', async () => {
    const updateWalletResponse = (
      await pmClient.updateWalletUsingPUT({
        Bearer: `Bearer ${mySessionToken}`,
        id: goodIdWallet,
        walletRequest: {
          data: {
            idPsp: -1,
          },
        },
      })
    ).fold(
      err => (err.pop()?.value as Response).status,
      () => undefined,
    );

    expect(updateWalletResponse).toEqual(422);
  });

  it('should return current wallet when data is empty', async () => {
    const updateWalletResponse = (
      await pmClient.updateWalletUsingPUT({
        Bearer: `Bearer ${mySessionToken}`,
        id: goodIdWallet,
        walletRequest: {
          data: {},
        },
      })
    ).fold(
      () => fail(),
      res => WalletResponse.decode(res.value).fold(() => fail(), identity),
    );

    expect(updateWalletResponse?.data.idPsp).toEqual(8);
    expect(updateWalletResponse?.data.psp?.businessName).toEqual('Poste Italiane');
  });
});
