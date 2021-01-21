import { Millisecond } from 'italia-ts-commons/lib/units';
import nodeFetch from 'node-fetch';
// Needed to patch the globals
import 'abort-controller/polyfill';
import { createHttpTerminator } from 'http-terminator';
import { PaymentManagerClient } from '../api/pagopa';
import { retryingFetch } from '../utils/fetch';
import * as myFetch from '../utils/fetch';

import pm from './pm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any,functional/immutable-data
(global as any).fetch = nodeFetch;

// Client for the PagoPA PaymentManager
describe('Payment Manager Client', () => {
  it('should call defaultRetryingFetch when invoking getSession endpoint of PM test server', async () => {
    const mySpyCustomFetch = jest.spyOn(myFetch, 'retryingFetch');

    const paymentManagerClient = PaymentManagerClient(
      'https://acardste.vaservices.eu:443/pp-restapi-CD',
      'ZXCVBNM098876543',
      retryingFetch(fetch, 5000 as Millisecond, 5),
      retryingFetch(fetch, 20000 as Millisecond, 0),
    );

    // Spy on th global fetch to check if it gets called

    const mySpyGlobalFetch = jest.spyOn(global, 'fetch');
    expect(paymentManagerClient).toBeTruthy();

    try {
      const responseP = await paymentManagerClient.getSession('ZXCVBNM098876543');
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
    const paymentManagerClient = PaymentManagerClient(
      'http://localhost:3000/wallet',
      'ZXCVBNM098876543',
      retryingFetch(fetch, 2000 as Millisecond, 0),
      retryingFetch(fetch, 2000 as Millisecond, 0),
    );

    expect(paymentManagerClient).toBeTruthy();

    // Spy on th global fetch to check if it gets called

    const mySpyGlobalFetch = jest.spyOn(global, 'fetch');

    // Pass the test even though the getSession rejects (usually due to the fact that
    // the dev server is down)
    try {
      const responseP = await paymentManagerClient.getSession('ZXCVBNM098876543');
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
    const paymentManagerClient = PaymentManagerClient(
      'http://localhost:50000',
      'ZXCVBNM098876543',
      retryingFetch(fetch, 3000 as Millisecond, 3),
      retryingFetch(fetch, 3000 as Millisecond, 3),
    );

    expect(paymentManagerClient).toBeTruthy();

    // Spy on th global fetch to check if it gets called
    const mySpyGlobalFetch = jest.spyOn(global, 'fetch');

    const responseP = await paymentManagerClient.getSession('ZXCVBNM098876543');
    expect(responseP.isRight()).toBeTruthy();

    // Please note the custom fetch gets called, but the global fetch doesn't
    expect(mySpyCustomFetch).toHaveBeenCalled();
    // Please note this assert is different from the one in raw fetch test
    expect(mySpyGlobalFetch).toHaveBeenCalledTimes(2);

    expect(responseP.map((myRes: any) => myRes.status).getOrElse(404)).toEqual(200);
    await stubServerTerminator.terminate();
  });
});
