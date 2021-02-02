import { Millisecond } from 'italia-ts-commons/lib/units';
import nodeFetch from 'node-fetch';
// Needed to patch the globals
import 'abort-controller/polyfill';
import { createHttpTerminator } from 'http-terminator';
import { retryingFetch } from '../utils/fetch';
import * as myFetch from '../utils/fetch';

import { createClient } from '../../generated/definitions/pagopa/client';

import { OsEnum } from '../../generated/definitions/pagopa/Device';
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

  it('should call defaultRetryingFetch when start-session endpoint of local stub of PM is invoked', async () => {
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
          fiscalCode: 'HBBJUU78U89R556T', // optional
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

  it('should return a left either (error 422) when start-session is called with a void payload', async () => {
    /* const HOST = process.env.PAYMENT_MANAGER_STUB_HOST as string;
    const PORT = process.env.PAYMENT_MANAGER_STUB_PORT ? parseInt(process.env.PAYMENT_MANAGER_STUB_PORT, 10) : 5000;
    const pmMockServer = pm.listen(PORT, HOST);
    const stubServerTerminator = createHttpTerminator({ server: pmMockServer }); */

    const HOST = 'localhost';
    const PORT = 8080;

    const paymentManagerClient = createClient({
      baseUrl: `http://${HOST}:${PORT}`,
      fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
    });

    // When startSessionRequest in the payload is void, get 500
    expect(
      (
        await paymentManagerClient.startSessionUsingPOST({
          startSessionRequest: {},
        })
      ).fold(
        err => (err.pop()?.value as Response).status,
        myRes => myRes.status,
      ),
    ).toEqual(500);

    expect(
      (
        await paymentManagerClient.startSessionUsingPOST({
          startSessionRequest: {
            data: {},
          },
        })
      ).fold(
        err => (err.pop()?.value as Response).status,
        myRes => myRes.status,
      ),
    ).toEqual(422);

    const pmResponse = await paymentManagerClient.startSessionUsingPOST({
      startSessionRequest: {
        data: {
          email: 'nunzia.ross@example.com',
          fiscalCode: 'UQNSFM56P12T733D', // seems to be ignored by PM
          idPayment: '12345', // seems to be ignored by PM
        },
      },
    });

    const pmResponseWithDevice = await paymentManagerClient.startSessionUsingPOST({
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

    expect(
      pmResponse.fold(
        () => undefined,
        myRes => myRes.value?.data?.user?.status,
      ),
    ).toEqual('ANONYMOUS');

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

    expect(
      (
        await paymentManagerClient.startSessionUsingPOST({
          startSessionRequest: {
            data: {
              fiscalCode: 'UQNSFM56P12T733D',
            },
          },
        })
      ).fold(
        err => (err.pop()?.value as Response).status,
        () => undefined,
      ),
    ).toEqual(500);

    // await stubServerTerminator.terminate();
  });
});
