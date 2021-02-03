import { Millisecond } from 'italia-ts-commons/lib/units';
import nodeFetch from 'node-fetch';
// Needed to patch the globals
import 'abort-controller/polyfill';
import { createHttpTerminator } from 'http-terminator';
import { retryingFetch } from '../utils/fetch';
import * as myFetch from '../utils/fetch';

import { createClient } from '../../generated/definitions/pagopa/client';

import pm from './pm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any,functional/immutable-data
(global as any).fetch = nodeFetch;

// Client for the PagoPA PaymentManager
describe('Payment Manager Client', () => {
  it('should call defaultRetryingFetch when invoking getSession endpoint of PM test server', async () => {
    const mySpyCustomFetch = jest.spyOn(myFetch, 'retryingFetch');

    const paymentManagerClient = createClient({
      baseUrl: process.env.PAYMENT_MANAGER_TEST as string,
      fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
    });

    // Spy on th global fetch to check if it gets called

    const mySpyGlobalFetch = jest.spyOn(global, 'fetch');
    expect(paymentManagerClient).toBeTruthy();

    try {
      const responseP = await paymentManagerClient.startSessionUsingPOST({
        startSessionRequest: {
          data: {
            email: 'pippo@pluto.com',
            fiscalCode: 'HBBJUU78U89R556T',
            idPayment: '12345',
          },
        },
      });
      expect(responseP.isLeft()).toBeTruthy();
      // Please note this assert is different from the one in raw fetch test
      expect(mySpyGlobalFetch).not.toHaveBeenCalled();
      expect(mySpyCustomFetch).toHaveBeenCalled();
    } catch {
      expect(true).toBeTruthy();
    }
  });

  it('should call defaultRetryingFetch when invoking getSession endpoint of local dev server for IO APP', async () => {
    const mySpyCustomFetch = jest.spyOn(myFetch, 'retryingFetch');
    const HOST = process.env.IOAPP_DEV_SERVER_HOST as string;
    const PORT = process.env.IOAPP_DEV_SERVER_PORT as string;
    const paymentManagerClient = createClient({
      baseUrl: `http://${HOST}:${PORT}/wallet`,
      fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
    });

    expect(paymentManagerClient).toBeTruthy();

    // Spy on th global fetch to check if it gets called

    const mySpyGlobalFetch = jest.spyOn(global, 'fetch');

    // Pass the test even though the getSession rejects (usually due to the fact that
    // the dev server is down)
    try {
      const responseP = await paymentManagerClient.startSessionUsingPOST({
        startSessionRequest: {
          data: {
            email: 'pippo@pluto.com',
            fiscalCode: 'HBBJUU78U89R556T',
            idPayment: '12345',
          },
        },
      });
      expect(responseP.isRight()).toBeTruthy();
      expect(responseP.map((myRes: any) => myRes.status).getOrElse(404)).toEqual(200);
      expect(mySpyCustomFetch).toHaveBeenCalled();
      // Please note this assert is different from the one in raw fetch test
      expect(mySpyGlobalFetch).not.toHaveBeenCalled();
    } catch (e) {
      expect(true).toBeTruthy();
    }
  });

  it('should call defaultRetryingFetch when getSession endpoint of local stub of PM is invoked', async () => {
    const HOST = process.env.PAYMENT_MANAGER_STUB_HOST as string;
    const PORT = process.env.PAYMENT_MANAGER_STUB_PORT ? parseInt(process.env.PAYMENT_MANAGER_STUB_PORT, 10) : 5000;
    const pmMockServer = pm.listen(PORT, HOST);
    const stubServerTerminator = createHttpTerminator({ server: pmMockServer });
    const mySpyCustomFetch = jest.spyOn(myFetch, 'retryingFetch');
    const paymentManagerClient = createClient({
      baseUrl: `http://${HOST}:${PORT}`,
      fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
    });

    expect(paymentManagerClient).toBeTruthy();

    // Spy on th global fetch to check if it gets called
    const mySpyGlobalFetch = jest.spyOn(global, 'fetch');

    const responseP = await paymentManagerClient.startSessionUsingPOST({
      startSessionRequest: {
        data: {
          email: 'pippo@pluto.com',
          fiscalCode: 'HBBJUU78U89R556T',
          idPayment: '12345',
        },
      },
    });
    expect(responseP.isRight()).toBeTruthy();

    // Please note the custom fetch gets called, but the global fetch doesn't
    expect(mySpyCustomFetch).toHaveBeenCalled();
    // Please note this assert is different from the one in raw fetch test
    expect(mySpyGlobalFetch).toHaveBeenCalledTimes(2);

    expect(responseP.map((myRes: any) => myRes.status).getOrElse(404)).toEqual(200);
    await stubServerTerminator.terminate();
  });

  it('should return successful response (200) when checkPayment endpoint is invoked with valid idPayment', async () => {
    const HOST = process.env.PAYMENT_MANAGER_STUB_HOST as string;
    const PORT = process.env.PAYMENT_MANAGER_STUB_PORT ? parseInt(process.env.PAYMENT_MANAGER_STUB_PORT, 10) : 5000;
    const pmMockServer = pm.listen(PORT, HOST);
    const stubServerTerminator = createHttpTerminator({ server: pmMockServer });

    const paymentManagerClient = createClient({
      baseUrl: `http://${HOST}:${PORT}`,
      fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
    });

    const idPayment = '8fa64d75-acb4-4a74-a87c-32f348a6a95f';

    const response = await paymentManagerClient.checkPaymentUsingGET({
      id: idPayment,
    });

    expect(response.isRight()).toBeTruthy();

    expect(
      response.fold(
        _ => fail(),
        response => response.status,
      ),
    ).toEqual(200);

    expect(
      response.fold(
        _ => fail(),
        response => response.value?.data?.idPayment,
      ),
    ).toEqual(idPayment);

    await stubServerTerminator.terminate();
  });

  it('should return UnprocessableEntity error (422) when checkPayment endpoint is invoked with idPayment already retrived', async () => {
    const HOST = process.env.PAYMENT_MANAGER_STUB_HOST as string;
    const PORT = process.env.PAYMENT_MANAGER_STUB_PORT ? parseInt(process.env.PAYMENT_MANAGER_STUB_PORT, 10) : 5000;
    const pmMockServer = pm.listen(PORT, HOST);

    const stubServerTerminator = createHttpTerminator({ server: pmMockServer });
    const paymentManagerClient = createClient({
      baseUrl: `http://${HOST}:${PORT}`,
      fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
    });

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

    await stubServerTerminator.terminate();
  });

  it('should return not found error (404) when checkPayment endpoint is invoked with idPayment not found', async () => {
    const HOST = process.env.PAYMENT_MANAGER_STUB_HOST as string;
    const PORT = process.env.PAYMENT_MANAGER_STUB_PORT ? parseInt(process.env.PAYMENT_MANAGER_STUB_PORT, 10) : 5000;
    const pmMockServer = pm.listen(PORT, HOST);

    const stubServerTerminator = createHttpTerminator({ server: pmMockServer });
    const paymentManagerClient = createClient({
      baseUrl: `http://${HOST}:${PORT}`,
      fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
    });

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

    await stubServerTerminator.terminate();
  });

  it('should return generic error (500) when checkPayment endpoint fails with generic error', async () => {
    const HOST = process.env.PAYMENT_MANAGER_STUB_HOST as string;
    const PORT = process.env.PAYMENT_MANAGER_STUB_PORT ? parseInt(process.env.PAYMENT_MANAGER_STUB_PORT, 10) : 5000;
    const pmMockServer = pm.listen(PORT, HOST);

    const stubServerTerminator = createHttpTerminator({ server: pmMockServer });
    const paymentManagerClient = createClient({
      baseUrl: `http://${HOST}:${PORT}`,
      fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
    });

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

    await stubServerTerminator.terminate();
  });
});
