import { Millisecond } from 'italia-ts-commons/lib/units';
import { fetch as polyfilledFetch } from 'whatwg-fetch';
// eslint-disable-next-line no-underscore-dangle,functional/immutable-data
(window as any)._env_ = {
  IO_PAY_API_TIMEOUT: '10000',
  IO_PAY_PAYMENT_MANAGER_HOST: 'http://localhost:8080',
  IO_PAY_ENV: 'develop',
  IO_PAY_FUNCTIONS_HOST: 'http://localhost:7071',
};
import { retryingFetch } from '../../utils/fetch';

function retryingFetchTest() {
  const myFetch = retryingFetch(polyfilledFetch, 2000 as Millisecond, 3);

  void myFetch('http://localhost:50000/transient-error', {
    headers: { 'upgrade-insecure-requests': '1' },
    method: 'GET',
  });
}

retryingFetchTest();
