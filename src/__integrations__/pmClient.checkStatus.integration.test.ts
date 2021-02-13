import { Server } from 'http';

import { Millisecond } from 'italia-ts-commons/lib/units';
import { DeferredPromise } from 'italia-ts-commons/lib/promises';

import nodeFetch from 'node-fetch';
// Needed to patch the globals
import 'abort-controller/polyfill';
import { createHttpTerminator } from 'http-terminator';
import { constantPollingWithPromisePredicateFetch, retryingFetch } from '../utils/fetch';

import { createClient } from '../../generated/definitions/pagopa/client';

import { TransactionStatusResponse } from '../../generated/definitions/pagopa/TransactionStatusResponse';
import pm from './pm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any,functional/immutable-data
(global as any).fetch = nodeFetch;

// Client for the PagoPA PaymentManager
describe('Payment Manager Client', () => {
  const HOST = process.env.PAYMENT_MANAGER_STUB_HOST as string;
  const PORT = process.env.PAYMENT_MANAGER_STUB_PORT ? parseInt(process.env.PAYMENT_MANAGER_STUB_PORT, 10) : 5000;

  // eslint-disable-next-line functional/no-let
  let pmMockServer: Server;

  // eslint-disable-next-line functional/no-let
  let paymentManagerClient;

  // eslint-disable-next-line functional/no-let
  let paymentManagerClientWithPolling;

  const transientErrorGivenFinalStatusCondition = async (r: Response): Promise<boolean> => {
    const myJson = (await r.clone().json()) as TransactionStatusResponse;
    return r.status === 200 && myJson.data?.finalStatus === false;
  };

  beforeAll(() => {
    pmMockServer = pm.listen(PORT, HOST);

    paymentManagerClient = createClient({
      baseUrl: `http://${HOST}:${PORT}`,
      fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
    });

    paymentManagerClientWithPolling = createClient({
      baseUrl: `http://${HOST}:${PORT}`,
      fetchApi: constantPollingWithPromisePredicateFetch(
        DeferredPromise<boolean>().e1,
        5,
        300,
        10000 as Millisecond,
        transientErrorGivenFinalStatusCondition,
      ),
    });
  });

  afterAll(async () => {
    const stubServerTerminator = createHttpTerminator({ server: pmMockServer });
    await stubServerTerminator.terminate();
  });

  it('should return successful response (200) when checkStatus endpoint is invoked for a complited transaction', async () => {
    const idTransaction = 6;
    const idTransactionBase64 = 'Ng==';

    const response = await paymentManagerClient.checkStatusUsingGET({
      id: idTransactionBase64,
    });

    expect(response.isRight()).toBeTruthy();

    expect(
      response.fold(
        _ => fail(),
        res => res.status,
      ),
    ).toEqual(200);

    expect(
      response.fold(
        _ => fail(),
        res => res.value?.data?.idTransaction,
      ),
    ).toEqual(idTransaction);

    expect(
      response.fold(
        _ => fail(),
        res => res.value?.data?.idStatus,
      ),
    ).toEqual(3);

    expect(
      response.fold(
        _ => fail(),
        res => res.value?.data?.finalStatus,
      ),
    ).toEqual(true);

    expect(
      response.fold(
        _ => fail(),
        res => res.value?.data?.result,
      ),
    ).toEqual('OK');
  });

  it('should return (422) when checkStatus endpoint is invoked for a transaction with null status code', async () => {
    const idTransactionBase64 = 'MTAw==';

    const response = await paymentManagerClient.checkStatusUsingGET({
      id: idTransactionBase64,
    });

    expect(
      response.fold(
        _ => fail(),
        res => res.status,
      ),
    ).toEqual(422);

    expect(
      response.fold(
        _ => fail(),
        res => res.value?.code,
      ),
    ).toEqual('9005');

    expect(
      response.fold(
        _ => fail(),
        res => res.value?.message,
      ),
    ).toEqual('Status code null');
  });

  it('should return generic error (500) when checkStatus endpoint is invoked with not base64 idTransaction', async () => {
    const idTransaction = '1';

    const response = await paymentManagerClient.checkStatusUsingGET({
      id: idTransaction,
    });
    expect(
      response.fold(
        _ => fail(),
        res => res.status,
      ),
    ).toEqual(500);

    expect(
      response.fold(
        _ => fail(),
        res => res.value?.code,
      ),
    ).toEqual('500');
  });

  it('return successful response (200) with 0 retry when checkStatus endpoint is invoked for transaction with final status true', async () => {
    const idTransactionBase64 = 'Ng==';

    const response = await paymentManagerClientWithPolling.checkStatusUsingGET({
      id: idTransactionBase64,
    });

    expect(response.isRight()).toBeTruthy();

    expect(
      response.fold(
        _ => fail(),
        res => res.status,
      ),
    ).toEqual(200);

    expect(
      response.fold(
        _ => fail(),
        res => res.value?.data?.finalStatus,
      ),
    ).toEqual(true);
  });

  it('should throw max-retries error after 5 retry when checkStatus endpoint is invoked for a unfinished transaction', async () => {
    const idTransactionBase64 = 'MjA=';
    try {
      await paymentManagerClientWithPolling.checkStatusUsingGET({
        id: idTransactionBase64,
      });
    } catch (e) {
      expect(e).toEqual('max-retries');
    }
  });

  it('return successful response (200) with 3 retry when checkStatus endpoint is invoked for transaction with final status true', async () => {
    const idTransactionBase64 = 'MzA=';

    const response = await paymentManagerClientWithPolling.checkStatusUsingGET({
      id: idTransactionBase64,
    });

    expect(response.isRight()).toBeTruthy();

    expect(
      response.fold(
        _ => fail(),
        res => res.status,
      ),
    ).toEqual(200);

    expect(
      response.fold(
        _ => fail(),
        res => res.value?.data?.finalStatus,
      ),
    ).toEqual(true);
  });
});
