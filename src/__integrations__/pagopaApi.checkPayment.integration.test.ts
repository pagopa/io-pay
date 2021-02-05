import { Server } from 'http';

import { Millisecond } from 'italia-ts-commons/lib/units';
import nodeFetch from 'node-fetch';
// Needed to patch the globals
import 'abort-controller/polyfill';
import { createHttpTerminator } from 'http-terminator';
import { retryingFetch } from '../utils/fetch';

import { createClient } from '../../generated/definitions/pagopa/client';

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

  it('should return successful response (200) when checkPayment endpoint is invoked with valid idPayment', async () => {
    const idPayment = '8fa64d75-acb4-4a74-a87c-32f348a6a95f';

    const response = await paymentManagerClient.checkPaymentUsingGET({
      id: idPayment,
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
        res => res.value?.data?.idPayment,
      ),
    ).toEqual(idPayment);
  });

  it('should return UnprocessableEntity error (422) when checkPayment endpoint is invoked with idPayment already retrived', async () => {
    const idPayment = 'ca41570b-8c03-496b-9192-9284dec646d2';

    expect(
      (
        await paymentManagerClient.checkPaymentUsingGET({
          id: idPayment,
        })
      ).fold(
        _ => fail(),
        response => response.status,
      ),
    ).toEqual(422);
  });

  it('should return not found error (404) when checkPayment endpoint is invoked with idPayment not found', async () => {
    const idPayment = 'bn41570b-8c03-5432-9192-4444dec646d2';

    expect(
      (
        await paymentManagerClient.checkPaymentUsingGET({
          id: idPayment,
        })
      ).fold(
        _ => fail(),
        response => response.status,
      ),
    ).toEqual(404);
  });

  it('should return generic error (500) when checkPayment endpoint fails with generic error', async () => {
    const idPayment = 'ba41570b-77c03-496b-9192-9284dec646d2';

    expect(
      (
        await paymentManagerClient.checkPaymentUsingGET({
          id: idPayment,
        })
      ).fold(
        _ => fail(),
        response => response.status,
      ),
    ).toEqual(500);
  });
});
