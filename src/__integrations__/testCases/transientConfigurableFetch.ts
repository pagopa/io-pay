import { fetch as polyfilledFetch } from 'whatwg-fetch';
import { transientConfigurableFetch } from '../../utils/fetch';

function transientConfigurableFetchTest() {
  // Set error 404 as transient error.
  const myFetch = transientConfigurableFetch(polyfilledFetch, 3, 404);
  void myFetch('http://localhost:5000/transient-error', {
    headers: { 'upgrade-insecure-requests': '1' },
    method: 'GET',
  });
}

transientConfigurableFetchTest();
