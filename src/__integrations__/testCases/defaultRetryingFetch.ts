import { Millisecond } from 'italia-ts-commons/lib/units';
import { fetch as polyfilledFetch } from 'whatwg-fetch';
import { defaultRetryingFetch } from '../../utils/fetch';

function defaultRetryingFetchTest() {
  // If the environment has an abortable fetch use the default
  if (!globalThis.AbortController) {
    require('abortcontroller-polyfill/dist/abortcontroller-polyfill-only');
  }
  const myFetch = defaultRetryingFetch(polyfilledFetch, 3 as Millisecond, 5000);

  void myFetch('http://localhost:5000/transient-error', {
    headers: { 'upgrade-insecure-requests': '1' },
    method: 'GET',
  });
}

defaultRetryingFetchTest();
