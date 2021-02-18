import { Millisecond } from 'italia-ts-commons/lib/units';
import { DeferredPromise } from 'italia-ts-commons/lib/promises';
import { fromNullable } from 'fp-ts/lib/Option';
import { fromLeft, fromPredicate, taskEither, TaskEither, tryCatch } from 'fp-ts/lib/TaskEither';
import { Client, createClient } from '../generated/definitions/pagopa/client';
import { TransactionStatusResponse } from '../generated/definitions/pagopa/TransactionStatusResponse';
import { Transaction } from '../generated/definitions/pagopa/Transaction';
import idpayguard from './js/idpayguard';
import { initHeader } from './js/header';
import { setTranslateBtns } from './js/translateui';
import { initDropdowns } from './js/dropdowns';
import { constantPollingWithPromisePredicateFetch, retryingFetch } from './utils/fetch';
import { GENERIC_STATUS, TX_ACCEPTED, UNKNOWN } from './utils/TransactionStatesTypes';

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

  const checkStatusTask = (
    transactionId: string,
    paymentManagerClient: Client,
  ): TaskEither<UNKNOWN, TransactionStatusResponse> =>
    tryCatch(
      () =>
        paymentManagerClient.checkStatusUsingGET({
          id: transactionId,
        }),
      () => UNKNOWN.value,
    ).foldTaskEither(
      err => fromLeft(err),
      errorOrResponse =>
        errorOrResponse.fold(
          () => fromLeft(UNKNOWN.value),
          responseType => (responseType.status !== 200 ? fromLeft(UNKNOWN.value) : taskEither.of(responseType.value)),
        ),
    );

  const getDataFromSessionStorageTask = (key: string): TaskEither<UNKNOWN, Transaction> =>
    Transaction.decode(JSON.parse(fromNullable(sessionStorage.getItem(key)).getOrElse(''))).fold(
      _ => fromLeft(UNKNOWN.value),
      transaction => taskEither.of(transaction),
    );

  const isNot3dsFlowTask = (
    transactionStatusResponse: TransactionStatusResponse,
  ): TaskEither<UNKNOWN, TransactionStatusResponse> =>
    fromPredicate(
      (transaction: TransactionStatusResponse) => fromNullable(transaction.data?.acsUrl).isNone(),
      _ => UNKNOWN.value,
    )(transactionStatusResponse);

  const showErrorStatus = () => {
    document.body.classList.remove('loadingOperations');
    document
      .querySelectorAll('[data-response]')
      .forEach(i => (i.getAttribute('data-response') == '3' ? null : i.remove()));
    //To improve
  };

  const showSuccessStatus = (idStatus: GENERIC_STATUS) => {
    document.body.classList.remove('loadingOperations');
    console.log(idStatus);
    TX_ACCEPTED.decode(idStatus).map(_ =>
      document
        .querySelectorAll('[data-response]')
        .forEach(i => (i.getAttribute('data-response') == '1' ? null : i.remove())),
    );
    // To improve
  };

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
    .chain(transactionStatusResponse =>
      checkStatusTask(
        Buffer.from(transactionStatusResponse.data.idTransaction.toString()).toString('base64'),
        paymentManagerClientWithPolling,
      ),
    )
    .fold(
      _ => showErrorStatus(),
      transactionStatusResponse => showSuccessStatus(transactionStatusResponse.data.idStatus),
    )
    .run();

  // clear sessionStorage
  sessionStorage.clear();
});
