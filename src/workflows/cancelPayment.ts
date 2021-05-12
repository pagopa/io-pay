import { fromLeft, taskEither, TaskEither, tryCatch } from 'fp-ts/lib/TaskEither';
import * as PmClient from '../../generated/definitions/pagopa/client';
import { ErrorsEnumType, ErrorsType } from '../js/errorhandler';
import {
  mixpanel,
  PAYMENT_DELETE_INIT,
  PAYMENT_DELETE_NET_ERR,
  PAYMENT_DELETE_RESP_ERR,
  PAYMENT_DELETE_SUCCESS,
  PAYMENT_DELETE_SVR_ERR,
} from '../utils/mixpanelHelperInit';

/**
 * This function define a task that:
 *
 * 1. invokes idPayment/actions/delete API of the Payment Manager;
 * 2. sends events to mixpanel.
 *
 * The result is a TaskEither<ErrorTask, string>;
 */
export const cancelPaymentTask = (
  pmClient: PmClient.Client,
  idPayment: string,
  sessionToken: string,
  koReason: string,
  showWallet: boolean,
): TaskEither<ErrorsEnumType, string> => {
  mixpanel.track(PAYMENT_DELETE_INIT.value, { EVENT_ID: PAYMENT_DELETE_INIT.value });
  return tryCatch(
    () =>
      pmClient.deleteBySessionCookieExpiredUsingDELETE({
        Bearer: `Bearer ${sessionToken}`,
        id: idPayment,
        koReason,
        showWallet,
      }),
    () => ErrorsType.CONNECTION,
  ).foldTaskEither(
    () => {
      mixpanel.track(PAYMENT_DELETE_NET_ERR.value, { EVENT_ID: PAYMENT_DELETE_NET_ERR.value });
      return fromLeft(ErrorsType.GENERIC_ERROR);
    },
    errOrResponse =>
      errOrResponse.fold(
        () => {
          mixpanel.track(PAYMENT_DELETE_SVR_ERR.value, { EVENT_ID: PAYMENT_DELETE_SVR_ERR.value });
          return fromLeft(ErrorsType.GENERIC_ERROR);
        },
        response => {
          const status = response.status;
          status === 200
            ? mixpanel.track(PAYMENT_DELETE_SUCCESS.value, { EVENT_ID: PAYMENT_DELETE_SUCCESS.value })
            : mixpanel.track(PAYMENT_DELETE_RESP_ERR.value, { EVENT_ID: PAYMENT_DELETE_RESP_ERR.value });
          return status === 200 ? taskEither.of(idPayment) : fromLeft(ErrorsType.GENERIC_ERROR);
        },
      ),
  );
};
