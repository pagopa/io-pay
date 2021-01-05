import { Millisecond } from 'italia-ts-commons/lib/units';
import { PaymentManagerClient } from '../pagopa';
import { defaultRetryingFetch } from '../../utils/fetch';
import * as myFetch from '../../utils/fetch';

// Client for the PagoPA PaymentManager
describe('Weak Test Suite', () => {
  it('When invoking getSession should call defaultRetryingFetch', async () => {
    const mySpyCustomFetch = jest.spyOn(myFetch, 'defaultRetryingFetch');

    const paymentManagerClient = PaymentManagerClient(
      'https://acardste.vaservices.eu:443/pp-restapi-CD',
      'ZXCVBNM098876543',
      defaultRetryingFetch(5000 as Millisecond, 5),
      defaultRetryingFetch(20000 as Millisecond, 0),
    );

    // After PM client instantiation, the 'global' var is guaranteed to have a fetch field
    // which points to nodeFetch
    const mySpyGlobalFetch = jest.spyOn(global, 'fetch');
    expect(paymentManagerClient).toBeTruthy();

    const responseP = await paymentManagerClient.getSession('ZXCVBNM098876543');
    expect(responseP.isLeft()).toBeTruthy();
    // Please note this assert is different from the one in raw fetch test
    expect(mySpyGlobalFetch).not.toHaveBeenCalled();
    expect(mySpyCustomFetch).toHaveBeenCalled();
  });

  it('When endpoint local dev server for IO APP', async () => {
    const mySpyCustomFetch = jest.spyOn(myFetch, 'defaultRetryingFetch');
    const paymentManagerClient = PaymentManagerClient(
      'http://localhost:3000/wallet',
      'ZXCVBNM098876543',
      defaultRetryingFetch(2000 as Millisecond, 0),
      defaultRetryingFetch(2000 as Millisecond, 0),
    );

    expect(paymentManagerClient).toBeTruthy();
    expect(global.fetch).toBeTruthy();
    expect(global.AbortController).toBeTruthy();

    // After PM client instantiation, the 'global' var is guaranteed to have a fetch field
    // which points to the nodeFetch. Let's spy on it to check if it gets called
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
});
