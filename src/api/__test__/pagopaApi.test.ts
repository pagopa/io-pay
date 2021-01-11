import { Server } from 'http';
import { Millisecond } from 'italia-ts-commons/lib/units';
import nodeFetch from 'node-fetch';
import { PaymentManagerClient } from '../pagopa';
import { defaultRetryingFetch } from '../../utils/fetch';
import * as myFetch from '../../utils/fetch';
import pm from './pm';

const {
  AbortController,
  // eslint-disable-next-line @typescript-eslint/no-var-requires
} = require('abortcontroller-polyfill/dist/cjs-ponyfill');

// eslint-disable-next-line @typescript-eslint/no-explicit-any,functional/immutable-data
(global as any).fetch = nodeFetch;
// eslint-disable-next-line @typescript-eslint/no-explicit-any,functional/immutable-data
(global as any).AbortController = AbortController;

// Client for the PagoPA PaymentManager
describe('PM Test Suite', () => {
  // eslint-disable-next-line functional/no-let
  let pmMockServer: Server = {} as Server;

  beforeAll(() => {
    pmMockServer = pm.listen(5000, '127.0.0.1');
  });

  // If the client can't get connected, close can't be invoked, so the test get stuck
  afterAll(() => pmMockServer.close());

  it('Test with local mock of PM', async () => {
    const mySpyCustomFetch = jest.spyOn(myFetch, 'defaultRetryingFetch');
    const paymentManagerClient = PaymentManagerClient(
      'http://127.0.0.1:5000',
      'ZXCVBNM098876543',
      defaultRetryingFetch(fetch, 2000 as Millisecond, 0),
      defaultRetryingFetch(fetch, 2000 as Millisecond, 0),
    );

    expect(paymentManagerClient).toBeTruthy();

    // After PM client instantiation, the 'global' var is guaranteed to have a fetch field
    // which points to the node-fetch. Let's spy on it to check if it gets called
    const mySpyGlobalFetch = jest.spyOn(global, 'fetch');

    const responseP = await paymentManagerClient.getSession('ZXCVBNM098876543');
    expect(responseP.isRight()).toBeTruthy();

    // Please note the custom fetch gets called, but the global fetch doesn't
    expect(mySpyCustomFetch).toHaveBeenCalled();
    // Please note this assert is different from the one in raw fetch test
    expect(mySpyGlobalFetch).not.toHaveBeenCalled();

    expect(responseP.map((myRes: any) => myRes.status).getOrElse(404)).toEqual(200);
  });
});
