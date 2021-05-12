import { Millisecond } from 'italia-ts-commons/lib/units';
import * as PmClient from '../generated/definitions/pagopa/client';
import { getConfigOrThrow } from './utils/config';
import { retryingFetch } from './utils/fetch';
import { cancelPaymentTask } from './workflows/cancelPayment';

const pmClient: PmClient.Client = PmClient.createClient({
  baseUrl: getConfigOrThrow().IO_PAY_PAYMENT_MANAGER_HOST,
  fetchApi: retryingFetch(fetch, 2000 as Millisecond, 3),
});
const checkDataStored = sessionStorage.getItem('checkData') || '';
const checkData = JSON.parse(checkDataStored);
const sessionToken = sessionStorage.getItem('sessionToken') || '';

// eslint-disable-next-line sonarjs/cognitive-complexity
document.addEventListener('DOMContentLoaded', async () => {
  window.sessionStorage.clear();

  await cancelPaymentTask(pmClient, checkData.idPayment, sessionToken, 'ANNUTE', false).run();

  const cancelButton = document.getElementById('cancel');
  cancelButton?.addEventListener('click', (e: Event) => {
    e.preventDefault();
    window.close();
  });
});
export {};
