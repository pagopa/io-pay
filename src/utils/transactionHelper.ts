import { fromNullable } from 'fp-ts/lib/Option';
import { fromLeft, taskEither, TaskEither, tryCatch } from 'fp-ts/lib/TaskEither';
import { Client } from '../../generated/definitions/pagopa/client';
import { Transaction } from '../../generated/definitions/pagopa/Transaction';
import { TransactionStatusResponse } from '../../generated/definitions/pagopa/TransactionStatusResponse';
import { GENERIC_STATUS, TX_ACCEPTED, UNKNOWN } from './TransactionStatesTypes';

export const resumeTransactionTask = (
  methodCompleted: 'Y' | 'N' | undefined,
  sessionToken: string,
  idTransaction: string,
  paymentManagerClient: Client,
): TaskEither<UNKNOWN, number> =>
  tryCatch(
    () =>
      paymentManagerClient.resume3ds2UsingPOST({
        Bearer: `Bearer ${sessionToken}`,
        id: idTransaction,
        resumeRequest: { data: { methodCompleted } },
      }),
    () => UNKNOWN.value,
  ).foldTaskEither(
    err => fromLeft(err),
    errorOrResponse =>
      errorOrResponse.fold(
        () => fromLeft(UNKNOWN.value),
        responseType => (responseType.status !== 200 ? fromLeft(UNKNOWN.value) : taskEither.of(responseType.status)),
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

export const getTransactionFromSessionStorageTask = (key: string): TaskEither<UNKNOWN, Transaction> =>
  Transaction.decode(JSON.parse(fromNullable(sessionStorage.getItem(key)).getOrElse(''))).fold(
    _ => fromLeft(UNKNOWN.value),
    data => taskEither.of(data),
  );

export const getStringFromSessionStorageTask = (key: string): TaskEither<UNKNOWN, string> =>
  fromNullable(sessionStorage.getItem(key)).fold(fromLeft(UNKNOWN.value), data => taskEither.of(data));
