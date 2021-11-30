import { fetch as polyfilledFetch } from 'whatwg-fetch';
import { Millisecond } from 'italia-ts-commons/lib/units';
// eslint-disable-next-line no-underscore-dangle,functional/immutable-data
(window as any)._env_ = {
  IO_PAY_API_TIMEOUT: '10000',
  IO_PAY_PAYMENT_MANAGER_HOST: 'http://localhost:8080',
  IO_PAY_ENV: 'develop',
  IO_PAY_FUNCTIONS_HOST: 'http://localhost:7071',
};
import { transientConfigurableFetch, ITransientFetchOpts } from '../../utils/fetch';

function transientConfigurableFetchTest() {
  // Set error 404 as transient error.
  const transientFetchOptions: ITransientFetchOpts = {
    numberOfRetries: 3,
    httpCodeMapToTransient: 404,
    delay: 10 as Millisecond,
    timeout: 10000 as Millisecond,
  };
  const myFetch = transientConfigurableFetch(polyfilledFetch, transientFetchOptions);
  void myFetch('http://localhost:50000/transient-error', {
    headers: { 'upgrade-insecure-requests': '1' },
    method: 'GET',
  });
}

transientConfigurableFetchTest();
