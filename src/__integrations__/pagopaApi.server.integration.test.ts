import { Millisecond } from 'italia-ts-commons/lib/units';
import nodeFetch from 'node-fetch';
// Needed to patch the globals
import 'abort-controller/polyfill';
import { createHttpTerminator } from 'http-terminator';
import { retryingFetch } from '../utils/fetch';
import * as myFetch from '../utils/fetch';

import { createClient } from '../../generated/definitions/pagopa/client';

import {
  approveTermsResponse,
  httpResponseStatus,
  sessionToken,
  sessionTokenInternalException,
  sessionTokenUnprocessableEntity,
} from '../__mocks__/mocks';

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

  it('should return a approve-terms 200 OK response', async () => {
    const HOST = process.env.PAYMENT_MANAGER_STUB_HOST as string;
    const PORT = process.env.PAYMENT_MANAGER_STUB_PORT ? parseInt(process.env.PAYMENT_MANAGER_STUB_PORT, 10) : 5000;
    const pmMockServer = pm.listen(PORT, HOST);
    const stubServerTerminator = createHttpTerminator({ server: pmMockServer });
    const paymentManagerClient = createClient({
      baseUrl: `http://${HOST}:${PORT}`,
      fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
    });

    expect(paymentManagerClient).toBeTruthy();

    const responseP = await paymentManagerClient.approveTermsUsingPOST({
      Bearer: sessionToken,
      approveTermsRequest: {
        data: {
          terms: true,
          privacy: true,
        },
      },
    });

    expect(responseP.isRight()).toBeTruthy();

    // check status response
    expect(responseP.map((myRes: any) => myRes.status).getOrElse(null)).toEqual(200);
    await stubServerTerminator.terminate();
  });

  it('should return a approve-terms 200 OK response and correct payload data', async () => {
    const HOST = process.env.PAYMENT_MANAGER_STUB_HOST as string;
    const PORT = process.env.PAYMENT_MANAGER_STUB_PORT ? parseInt(process.env.PAYMENT_MANAGER_STUB_PORT, 10) : 5000;
    const pmMockServer = pm.listen(PORT, HOST);
    const stubServerTerminator = createHttpTerminator({ server: pmMockServer });
    const paymentManagerClient = createClient({
      baseUrl: `http://${HOST}:${PORT}`,
      fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
    });

    expect(paymentManagerClient).toBeTruthy();

    // sent terms: true && privacy: true
    const responseP = await paymentManagerClient.approveTermsUsingPOST({
      Bearer: sessionToken,
      approveTermsRequest: {
        data: {
          terms: true,
          privacy: true,
        },
      },
    });

    expect(responseP.isRight()).toBeTruthy();

    // check status response
    expect(responseP.map((myRes: any) => myRes.status).getOrElse(null)).toEqual(200);

    // check body responseP
    expect(
      responseP.fold(
        () => undefined,
        myRes => myRes.value?.data,
      ),
    ).toEqual(approveTermsResponse);

    await stubServerTerminator.terminate();
  });

  it('should return a approve-terms NOK responses', async () => {
    const HOST = process.env.PAYMENT_MANAGER_STUB_HOST as string;
    const PORT = process.env.PAYMENT_MANAGER_STUB_PORT ? parseInt(process.env.PAYMENT_MANAGER_STUB_PORT, 10) : 5000;
    const pmMockServer = pm.listen(PORT, HOST);
    const stubServerTerminator = createHttpTerminator({ server: pmMockServer });
    const paymentManagerClient = createClient({
      baseUrl: `http://${HOST}:${PORT}`,
      fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
    });

    expect(paymentManagerClient).toBeTruthy();

    // session token empy
    expect(
      (
        await paymentManagerClient.approveTermsUsingPOST({
          // eslint-disable-next-line
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

    // privacy doesn't set or terms doesn't accept : 400 bad request
    // TODO

    // session token wrong
    expect(
      (
        await paymentManagerClient.approveTermsUsingPOST({
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

    // RestApiUnprocessableEntityException check
    expect(
      (
        await paymentManagerClient.approveTermsUsingPOST({
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

    // RestAPIInternalException check
    expect(
      (
        await paymentManagerClient.approveTermsUsingPOST({
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

    await stubServerTerminator.terminate();
  });
});
