import { Millisecond } from 'italia-ts-commons/lib/units';
import { fetch as polyfilledFetch } from 'whatwg-fetch';
import { retryingFetch } from '../../utils/fetch';

function retryingFetchTest() {
  // If the environment doesn't have an abort controller load a polyfill
  if (!globalThis.AbortController) {
    require('abortcontroller-polyfill/dist/abortcontroller-polyfill-only');
  }
  const myFetch = retryingFetch(polyfilledFetch, 2000 as Millisecond, 3);

  void myFetch('http://localhost:5000/transient-error', {
    headers: { 'upgrade-insecure-requests': '1' },
    method: 'GET',
  });
}

retryingFetchTest();
