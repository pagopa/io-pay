import { debug } from 'console';
import { Server } from 'http';

import { fromNullable } from 'fp-ts/lib/Option';
import 'abort-controller/polyfill';
import nodeFetch from 'node-fetch';
import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import { Millisecond } from 'italia-ts-commons/lib/units';

import * as myFake from 'faker/locale/it';
import { createClient, Client } from '../../generated/definitions/pagopa/client';
import { retryingFetch } from '../utils/fetch';
// import { TypeEnum } from '../../generated/definitions/pagopa/Wallet';

import pm from './pm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any,functional/immutable-data
(global as any).fetch = nodeFetch;

describe('Endpoint pay of PM', () => {
  debug('start');
  // Set the testing environment

  const PORT = process.env.PAYMENT_MANAGER_STUB_PORT ? parseInt(process.env.PAYMENT_MANAGER_STUB_PORT, 10) : 8080;
  const HOST = process.env.PAYMENT_MANAGER_STUB_HOST as string;
  // eslint-disable-next-line functional/no-let
  let pmClient: Client;

  // eslint-disable-next-line functional/no-let
  let pmServer: Server;

  // eslint-disable-next-line functional/no-let
  let pmServerTerminator: HttpTerminator;

  const goodIdPayment = '8fa64d75-acb4-4a74-a87c-32f348a6a95f';
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

  it('should return idWallet, idPayment and amount matching the ones in previous calls ', async () => {
    // Pay
    const payResponse = (
      await pmClient.payUsingPOST({
        Bearer: `Bearer ${mySessionToken}`,
        id: goodIdPayment,
        payRequest: {
          data: { idWallet: goodIdWallet, cvv: '666' },
        },
        language: 'it',
      })
    ).fold(
      () => fail(),
      res => res.value?.data,
    );

    expect(payResponse?.idWallet).toEqual(goodIdWallet);
    expect(payResponse?.nodoIdPayment).toEqual(goodIdPayment);
    expect(
      fromNullable(payResponse?.amount?.amount).getOrElse(0) + fromNullable(payResponse?.fee?.amount).getOrElse(0),
    ).toEqual(fromNullable(payResponse?.grandTotal?.amount).getOrElse(0));
  });

  it('should return 404 when the idPayment is void', async () => {
    // Pay
    const payResponseStatus = (
      await pmClient.payUsingPOST({
        Bearer: `Bearer ${mySessionToken}`,
        id: '',
        payRequest: {
          data: { idWallet: goodIdWallet, cvv: '666' },
        },
        language: 'it',
      })
    ).fold(
      () => fail(),
      res => res.status,
    );

    expect(payResponseStatus).toEqual(404);
  });

  it('should return 422 when the idWallet is wrong', async () => {
    // Pay
    const payResponseStatus = (
      await pmClient.payUsingPOST({
        Bearer: `Bearer ${mySessionToken}`,
        id: goodIdPayment,
        payRequest: {
          data: { idWallet: -1, cvv: '666' },
        },
        language: 'it',
      })
    ).fold(
      err => (err.pop()?.value as Response).status,
      () => undefined,
    );

    expect(payResponseStatus).toEqual(422);
  });

  it('should return 422 when the idPayment is wrong', async () => {
    // Pay
    const payResponseStatus = (
      await pmClient.payUsingPOST({
        Bearer: `Bearer ${mySessionToken}`,
        id: 'wrong_idPayment',
        payRequest: {
          data: { idWallet: goodIdWallet, cvv: '666' },
        },
        language: 'it',
      })
    ).fold(
      err => (err.pop()?.value as Response).status,
      () => undefined,
    );

    expect(payResponseStatus).toEqual(422);
  });

  it('should return 500 when the payRequest is empty', async () => {
    // Pay
    const payResponseStatus = (
      await pmClient.payUsingPOST({
        Bearer: `Bearer ${mySessionToken}`,
        id: goodIdPayment,
        payRequest: {},
        language: 'it',
      })
    ).fold(
      err => (err.pop()?.value as Response).status,
      () => undefined,
    );

    expect(payResponseStatus).toEqual(500);
  });
});
