import { fromNullable } from 'fp-ts/lib/Option';
import { fromLeft, fromPredicate, taskEither, TaskEither, tryCatch } from 'fp-ts/lib/TaskEither';
import { Client } from '../../generated/definitions/pagopa/client';
import { Transaction } from '../../generated/definitions/pagopa/Transaction';
import { TransactionStatusResponse } from '../../generated/definitions/pagopa/TransactionStatusResponse';
import { GENERIC_STATUS, TX_ACCEPTED, UNKNOWN } from './TransactionStatesTypes';

export const checkMethodTask = (
  transactionId: string,
  paymentManagerClientWithPolling: Client, // Must poll on Status == 15
): TaskEither<UNKNOWN, TransactionStatusResponse> =>
  tryCatch(
    () =>
      paymentManagerClientWithPolling.checkStatusUsingGET({
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

export const checkStatusTask = (
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

export const getDataFromSessionStorageTask = (key: string): TaskEither<UNKNOWN, Transaction> =>
  Transaction.decode(JSON.parse(fromNullable(sessionStorage.getItem(key)).getOrElse(''))).fold(
    _ => fromLeft(UNKNOWN.value),
    data => taskEither.of(data),
  );

export const isNot3dsFlowTask = (
  transactionStatusResponse: TransactionStatusResponse,
): TaskEither<UNKNOWN, TransactionStatusResponse> =>
  fromPredicate(
    (transaction: TransactionStatusResponse) => fromNullable(transaction.data?.acsUrl).isNone(),
    _ => UNKNOWN.value,
  )(transactionStatusResponse);

export const showErrorStatus = () => {
  document.body.classList.remove('loadingOperations');
  document
    .querySelectorAll('[data-response]')
    .forEach(i => (i.getAttribute('data-response') === '3' ? null : i.remove()));
  // To improve
};

export const showSuccessStatus = (idStatus: GENERIC_STATUS) => {
  document.body.classList.remove('loadingOperations');
  TX_ACCEPTED.decode(idStatus).map(_ =>
    document
      .querySelectorAll('[data-response]')
      .forEach(i => (i.getAttribute('data-response') === '1' ? null : i.remove())),
  );
  // To improve
};
