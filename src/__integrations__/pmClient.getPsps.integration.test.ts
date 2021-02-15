import { Server } from 'http';

import { Millisecond } from 'italia-ts-commons/lib/units';

import nodeFetch from 'node-fetch';

import { createHttpTerminator } from 'http-terminator';
import { retryingFetch } from '../utils/fetch';

import { Client, createClient } from '../../generated/definitions/pagopa/client';

import * as myFake from 'faker/locale/it';

import pm from './pm';
import { PspListResponse } from '../../generated/definitions/pagopa/PspListResponse';
import { Psp } from '../../generated/definitions/pagopa/Psp';
import { fromNullable } from 'fp-ts/lib/Option';

// eslint-disable-next-line @typescript-eslint/no-explicit-any,functional/immutable-data
(global as any).fetch = nodeFetch;

// Client for the PagoPA PaymentManager
describe('Payment Manager Client to retrive psps', () => {
  const HOST = process.env.PAYMENT_MANAGER_STUB_HOST as string;
  const PORT = process.env.PAYMENT_MANAGER_STUB_PORT ? parseInt(process.env.PAYMENT_MANAGER_STUB_PORT, 10) : 5000;

  const mySessionToken = myFake.random.alphaNumeric(128);

  // eslint-disable-next-line functional/no-let
  let pmMockServer: Server;

  // eslint-disable-next-line functional/no-let
  let paymentManagerClient: Client;

  beforeAll(() => {
    pmMockServer = pm.listen(PORT, HOST);

    paymentManagerClient = createClient({
      baseUrl: `http://${HOST}:${PORT}`,
      fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
    });
  });

  afterAll(async () => {
    const stubServerTerminator = createHttpTerminator({ server: pmMockServer });
    await stubServerTerminator.terminate();
  });

  it('should return successful response (200) with 3 psps when getPspListUsingGET is invoked for a valid payment with an italian credit card', async () => {
    const idPayment = 'c69eae39-7de1-40a5-86aa-2bb1b17c7b80';
    const Bearer = `Bearer ${mySessionToken}`;
    const paymentType = 'CREDIT_CARD';
    const isList = true;
    const language = 'it';
    const idWallet = 17;

    const response = await paymentManagerClient.getPspListUsingGET({
      Bearer,
      paymentType,
      isList,
      idWallet,
      language,
      idPayment,
    });

    expect(response.isRight()).toBeTruthy();

    expect(
      response.fold(
        _ => fail(),
        res => res.status,
      ),
    ).toEqual(200);

    response.fold(
      _ => fail(),
      res => {
        const pspListResponse: PspListResponse = res.value;
        const itPspsList: readonly Psp[] = fromNullable(pspListResponse.data?.pspList).getOrElse([]);
        expect(itPspsList.length).toEqual(3);
        itPspsList.forEach(psp => {
          expect(psp.lingua).toEqual('IT'); // italian PSP
          expect(psp.paymentType).toEqual('CP'); // Credit Card
        });
      },
    );
  });

  it('should return successful response (200) with 1 psps when getPspListUsingGET is invoked to return the first psp for valid payment with an italian credit card', async () => {
    const idPayment = 'c69eae39-7de1-40a5-86aa-2bb1b17c7b80';
    const Bearer = `Bearer ${mySessionToken}`;
    const paymentType = 'CREDIT_CARD';
    const isList = false;
    const language = 'it';
    const idWallet = 17;

    const response = await paymentManagerClient.getPspListUsingGET({
      Bearer,
      paymentType,
      isList,
      idWallet,
      language,
      idPayment,
    });

    expect(response.isRight()).toBeTruthy();

    expect(
      response.fold(
        _ => fail(),
        res => res.status,
      ),
    ).toEqual(200);

    response.fold(
      _ => fail(),
      res => {
        const pspListResponse: PspListResponse = res.value;
        const itPspsList: readonly Psp[] = fromNullable(pspListResponse.data?.pspList).getOrElse([]);
        expect(itPspsList.length).toEqual(1);
        itPspsList.forEach(psp => {
          expect(psp.lingua).toEqual('IT'); // italian PSP
          expect(psp.paymentType).toEqual('CP'); // Credit Card
        });
      },
    );
  });

  it('should return successful response (200) with 1 psps when getPspListUsingGET is invoked for a valid payment with an english credit card', async () => {
    const idPayment = 'c69eae39-7de1-40a5-86aa-2bb1b17c7b80';
    const Bearer = `Bearer ${mySessionToken}`;
    const paymentType = 'CREDIT_CARD';
    const isList = true;
    const language = 'en';
    const idWallet = 17;

    const response = await paymentManagerClient.getPspListUsingGET({
      Bearer,
      paymentType,
      isList,
      idWallet,
      language,
      idPayment,
    });

    expect(response.isRight()).toBeTruthy();

    expect(
      response.fold(
        _ => fail(),
        res => res.status,
      ),
    ).toEqual(200);

    response.fold(
      _ => fail(),
      res => {
        const pspListResponse: PspListResponse = res.value;
        const itPspsList: readonly Psp[] = fromNullable(pspListResponse.data?.pspList).getOrElse([]);
        expect(itPspsList.length).toEqual(1);
        itPspsList.forEach(psp => {
          expect(psp.lingua).toEqual('EN'); // italian PSP
          expect(psp.paymentType).toEqual('CP'); // Credit Card
        });
      },
    );
  });

  it('should return error response (422)  when getPspListUsingGET is invoked for a invalid payment', async () => {
    const idPayment = 'xxx';
    const Bearer = `Bearer ${mySessionToken}`;
    const paymentType = 'CREDIT_CARD';
    const isList = true;
    const language = 'en';
    const idWallet = 17;

    const response = await paymentManagerClient.getPspListUsingGET({
      Bearer,
      paymentType,
      isList,
      idWallet,
      language,
      idPayment,
    });

    expect(response.isRight()).toBeTruthy();

    expect(
      response.fold(
        _ => fail(),
        res => res.status,
      ),
    ).toEqual(422);
  });

  it('should return error response (401)  when getPspListUsingGET is invoked with invalid token', async () => {
    const idPayment = 'xxx';
    const Bearer = `Bearer tsxc`;
    const paymentType = 'CREDIT_CARD';
    const isList = true;
    const language = 'en';
    const idWallet = 17;

    const response = await paymentManagerClient.getPspListUsingGET({
      Bearer,
      paymentType,
      isList,
      idWallet,
      language,
      idPayment,
    });

    expect(response.isRight()).toBeTruthy();

    expect(
      response.fold(
        _ => fail(),
        res => res.status,
      ),
    ).toEqual(401);
  });
});
