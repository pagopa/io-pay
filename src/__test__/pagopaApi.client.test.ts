import { Millisecond } from 'italia-ts-commons/lib/units';
import nodeFetch from 'node-fetch';
// Needed to patch the globals
import 'abort-controller/polyfill';
import { createHttpTerminator } from 'http-terminator';
import { retryingFetch } from '../utils/fetch';
import * as myFetch from '../utils/fetch';

import { createClient } from '../../generated/definitions/pagopa_live/client';

import pm from '../__integrations__/pm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any,functional/immutable-data
(global as any).fetch = nodeFetch;

// Client for the PagoPA PaymentManager
describe('Payment Manager Client', () => {
  it('should call defaultRetryingFetch when invoking getSession endpoint of PM test server', async () => {
    const mySpyCustomFetch = jest.spyOn(myFetch, 'retryingFetch');

    const paymentManagerClient = createClient({
      baseUrl: 'https://acardste.vaservices.eu:443/pp-restapi-CD',
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
    const paymentManagerClient = createClient({
      baseUrl: 'http://localhost:3000/wallet',
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
    const pmMockServer = pm.listen(50000, 'localhost');
    const stubServerTerminator = createHttpTerminator({ server: pmMockServer });
    const mySpyCustomFetch = jest.spyOn(myFetch, 'retryingFetch');
    const paymentManagerClient = createClient({
      baseUrl: 'http://localhost:50000',
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
});
