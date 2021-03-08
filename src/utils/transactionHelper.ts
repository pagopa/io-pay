import { toError } from 'fp-ts/lib/Either';
import { fromNullable } from 'fp-ts/lib/Option';
import { fromLeft, taskEither, TaskEither, tryCatch } from 'fp-ts/lib/TaskEither';
import { Client } from '../../generated/definitions/pagopa/client';
import { Transaction } from '../../generated/definitions/pagopa/Transaction';
import { TransactionStatusResponse } from '../../generated/definitions/pagopa/TransactionStatusResponse';
import { track } from '../__mocks__/mocks';
import {
  TRANSACTION_POLLING_M_CHECK_INIT,
  TRANSACTION_POLLING_M_CHECK_NET_ERR,
  TRANSACTION_POLLING_M_CHECK_SVR_ERR,
  TRANSACTION_POLLING_M_CHECK_SUCCESS,
  TRANSACTION_POLLING_M_CHECK_RESP_ERR,
  TRANSACTION_RESUME3DS2_STEP1_INIT,
  TRANSACTION_RESUME3DS2_STEP1_NET_ERR,
  TRANSACTION_RESUME3DS2_STEP1_SVR_ERR,
  TRANSACTION_RESUME3DS2_STEP1_RESP_ERR,
  TRANSACTION_RESUME3DS2_STEP1_SUCCESS,
} from './mixpanelHelperInit';
import { UNKNOWN } from './TransactionStatesTypes';

export const resumeTransactionTask = (
  methodCompleted: 'Y' | 'N' | undefined,
  sessionToken: string,
  idTransaction: string,
  paymentManagerClient: Client,
): TaskEither<UNKNOWN, number> => {
  track(TRANSACTION_RESUME3DS2_STEP1_INIT.value, {
    EVENT_ID: TRANSACTION_RESUME3DS2_STEP1_INIT.value,
    token: idTransaction,
    methodCompleted,
  });
  return tryCatch(
    () =>
      paymentManagerClient.resume3ds2UsingPOST({
        Bearer: `Bearer ${sessionToken}`,
        id: idTransaction,
        resumeRequest: { data: { methodCompleted } },
      }),
    e => {
      // TODO: #RENDERING_ERROR
      track(TRANSACTION_RESUME3DS2_STEP1_NET_ERR.value, { EVENT_ID: TRANSACTION_RESUME3DS2_STEP1_NET_ERR.value, e });
      return toError;
    },
  ).foldTaskEither(
    err => {
      // TODO: #RENDERING_ERROR
      track(TRANSACTION_RESUME3DS2_STEP1_SVR_ERR.value, { EVENT_ID: TRANSACTION_RESUME3DS2_STEP1_SVR_ERR.value, err });
      return fromLeft(UNKNOWN.value);
    }, // to be replaced with logic to handle failures
    errorOrResponse =>
      errorOrResponse.fold(
        () => fromLeft(UNKNOWN.value),
        responseType => {
          if (responseType.status === 200) {
            track(TRANSACTION_RESUME3DS2_STEP1_SUCCESS.value, {
              EVENT_ID: TRANSACTION_RESUME3DS2_STEP1_SUCCESS.value,
              token: idTransaction,
            });
          } else {
            track(TRANSACTION_RESUME3DS2_STEP1_RESP_ERR.value, {
              EVENT_ID: TRANSACTION_RESUME3DS2_STEP1_RESP_ERR.value,
              // code: responseType?.value.code,
              // message: responseType?.value.message,
              code: -2,
              message: 'ERR MSG',
            });
          }
          return responseType.status !== 200 ? fromLeft(UNKNOWN.value) : taskEither.of(responseType.status);
        },
      ),
  );
};

export const checkStatusTask = (
  transactionId: string,
  paymentManagerClient: Client,
): TaskEither<UNKNOWN, TransactionStatusResponse> => {
  track(TRANSACTION_POLLING_M_CHECK_INIT.value, {
    EVENT_ID: TRANSACTION_POLLING_M_CHECK_INIT.value,
    token: transactionId,
  });
  return tryCatch(
    () =>
      paymentManagerClient.checkStatusUsingGET({
        id: transactionId,
      }),
    e => {
      // TODO: #RENDERING_ERROR
      track(TRANSACTION_POLLING_M_CHECK_NET_ERR.value, { EVENT_ID: TRANSACTION_POLLING_M_CHECK_NET_ERR.value, e });
      return toError;
    },
  ).foldTaskEither(
    err => {
      // TODO: #RENDERING_ERROR
      track(TRANSACTION_POLLING_M_CHECK_SVR_ERR.value, { EVENT_ID: TRANSACTION_POLLING_M_CHECK_SVR_ERR.value, err });
      return fromLeft(UNKNOWN.value);
    }, // to be replaced with logic to handle failures
    errorOrResponse =>
      errorOrResponse.fold(
        () => fromLeft(UNKNOWN.value),
        responseType => {
          if (responseType.status === 200) {
            track(TRANSACTION_POLLING_M_CHECK_SUCCESS.value, {
              EVENT_ID: TRANSACTION_POLLING_M_CHECK_SUCCESS.value,
              token: transactionId,
              idStatus: responseType?.value?.data?.idStatus,
              statusMessage: responseType?.value?.data?.statusMessage,
              finalStatus: responseType?.value?.data?.finalStatus,
              acsUrl: responseType?.value?.data?.acsUrl,
              methodUrl: responseType?.value?.data?.methodUrl,
            });
          } else {
            track(TRANSACTION_POLLING_M_CHECK_RESP_ERR.value, {
              EVENT_ID: TRANSACTION_POLLING_M_CHECK_RESP_ERR.value,
              code: responseType?.value.code,
              message: responseType?.value.message,
            });
          }
          return responseType.status !== 200 ? fromLeft(UNKNOWN.value) : taskEither.of(responseType.value);
        },
      ),
  );
};

export const getTransactionFromSessionStorageTask = (key: string): TaskEither<UNKNOWN, Transaction> =>
  Transaction.decode(JSON.parse(fromNullable(sessionStorage.getItem(key)).getOrElse(''))).fold(
    _ => fromLeft(UNKNOWN.value),
    data => taskEither.of(data),
  );

export const getStringFromSessionStorageTask = (key: string): TaskEither<UNKNOWN, string> =>
  fromNullable(sessionStorage.getItem(key)).fold(fromLeft(UNKNOWN.value), data => taskEither.of(data));
