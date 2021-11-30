import { Millisecond } from 'italia-ts-commons/lib/units';
import { createClient } from '../../../generated/definitions/pagopa/client';
// eslint-disable-next-line functional/immutable-data, no-underscore-dangle
(global as any).window._env_ = {
  IO_PAY_PAYMENT_MANAGER_HOST: 'http://localhost:8080',
  IO_PAY_FUNCTIONS_HOST: 'http://localhost:7071',
  IO_PAY_ENV: 'develop',
  IO_PAY_API_TIMEOUT: '10000',
} as any;
import { transientConfigurableFetch } from '../../utils/fetch';

document.addEventListener('DOMContentLoaded', async () => {
  const pmClient = createClient({
    baseUrl: 'http://localhost:5000',
    fetchApi: transientConfigurableFetch(fetch, {
      numberOfRetries: 3,
      httpCodeMapToTransient: 429,
      delay: 10 as Millisecond,
      timeout: 10000 as Millisecond,
    }),
  });

  await pmClient.startSessionUsingPOST({
    startSessionRequest: {
      data: {
        // on this email PM Stub returns 429
        email: 'tooManyRequests@pm.com',
        fiscalCode: 'HBBJUU78U89R556T',
        idPayment: '12345',
      },
    },
  });
});
