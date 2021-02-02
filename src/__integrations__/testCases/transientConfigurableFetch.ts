import { fetch as polyfilledFetch } from 'whatwg-fetch';
import { Millisecond } from 'italia-ts-commons/lib/units';
import { transientConfigurableFetch, ITransientFetchOpts } from '../../utils/fetch';

function transientConfigurableFetchTest() {
  // Set error 404 as transient error.
  const transientFetchOptions: ITransientFetchOpts = {
    numberOfRetries: 3,
    httpCodeMapToTransient: 404,
    delay: 10 as Millisecond,
    timeout: 1000 as Millisecond,
  };
  const myFetch = transientConfigurableFetch(polyfilledFetch, transientFetchOptions);
  void myFetch('http://localhost:50000/transient-error', {
    headers: { 'upgrade-insecure-requests': '1' },
    method: 'GET',
  });
}

transientConfigurableFetchTest();
