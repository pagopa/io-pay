import { Millisecond } from 'italia-ts-commons/lib/units';
import { DeferredPromise } from 'italia-ts-commons/lib/promises';
import { Client, createClient } from '../generated/definitions/pagopa/client';
import { TransactionStatusResponse } from '../generated/definitions/pagopa/TransactionStatusResponse';
import idpayguard from './js/idpayguard';
import { initHeader } from './js/header';
import { setTranslateBtns } from './js/translateui';
import { initDropdowns } from './js/dropdowns';
import { constantPollingWithPromisePredicateFetch, retryingFetch } from './utils/fetch';
import {
  checkStatusTask,
  getDataFromSessionStorageTask,
  isNot3dsFlowTask,
  showErrorStatus,
  showSuccessStatus,
} from './utils/transactionHelper';

// eslint-disable-next-line sonarjs/cognitive-complexity
document.addEventListener('DOMContentLoaded', async () => {
  const retries: number = 10;
  const delay: number = 3000;
  const timeout: Millisecond = 20000 as Millisecond;

  const isTransientErrorGivenFinalStatus = async (response: Response): Promise<boolean> => {
    const transactionStatus = TransactionStatusResponse.encode(await response.clone().json());
    return response.status === 200 && transactionStatus.data?.finalStatus === false;
  };

  const paymentManagerClientWithPolling: Client = createClient({
    baseUrl: 'http://localhost:8080',
    fetchApi: constantPollingWithPromisePredicateFetch(
      DeferredPromise<boolean>().e1,
      retries,
      delay,
      timeout,
      isTransientErrorGivenFinalStatus,
    ),
  });

  const paymentManagerClient = createClient({
    baseUrl: 'http://localhost:8080',
    fetchApi: retryingFetch(fetch, 2000 as Millisecond, 3),
  });

  document.body.classList.add('loadingOperations');

  // idpayguard
  idpayguard();

  // initHeader
  initHeader();

  initDropdowns();

  // init translations
  setTranslateBtns();

  // set email address in placeholder
  const useremailPlaceholder = document.querySelectorAll('.windowcont__response__useremail') || null;
  const useremailArray = Array.from(useremailPlaceholder);
  const useremail = sessionStorage.getItem('useremail') || '';
  for (const el of useremailArray) {
    // eslint-disable-next-line functional/immutable-data
    (el as HTMLElement).innerText = useremail;
  }

  getDataFromSessionStorageTask('payment')
    .chain(transaction => checkStatusTask(transaction.token, paymentManagerClient))
    .chain(transactionStatusResponse => isNot3dsFlowTask(transactionStatusResponse))
    .fold(
      _ => showErrorStatus(), // 3ds case
      transactionStatusResponse =>
        checkStatusTask(
          Buffer.from(transactionStatusResponse.data.idTransaction.toString()).toString('base64'),
          paymentManagerClientWithPolling,
        )
          .fold(
            _ => showErrorStatus(),
            transactionStatusResponse => showSuccessStatus(transactionStatusResponse.data.idStatus),
          )
          .run(),
    )
    .run();

  // clear sessionStorage
  sessionStorage.clear();
});
