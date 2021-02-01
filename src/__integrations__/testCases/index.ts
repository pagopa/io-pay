import { Millisecond } from 'italia-ts-commons/lib/units';
import { createClient } from '../../../generated/definitions/pagopa/client';
import { transientConfigurableFetch } from '../../utils/fetch';

document.addEventListener('DOMContentLoaded', async () => {
  const pmClient = createClient({
    baseUrl: 'http://localhost:9666',
    fetchApi: transientConfigurableFetch(fetch, {
      numberOfRetries: 3,
      httpCodeMapToTransient: 429,
      delay: 10 as Millisecond,
      timeout: 4000 as Millisecond,
    }),
  });

  await pmClient.startSessionUsingPOST({
    startSessionRequest: {
      data: {
        email: 'pippo@pluto.com',
        fiscalCode: 'HBBJUU78U89R556T',
        idPayment: '12345',
      },
    },
  });
});
