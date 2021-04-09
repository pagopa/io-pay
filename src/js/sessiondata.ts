import { Millisecond } from 'italia-ts-commons/lib/units';
import { fromNullable } from 'fp-ts/lib/Option';
import { tryCatch } from 'fp-ts/lib/TaskEither';
import { toError } from 'fp-ts/lib/Either';
import { createClient } from '../../generated/definitions/pagopa/client';
import { retryingFetch } from '../utils/fetch';
import { mixpanel } from '../__mocks__/mocks';
import {
  PAYMENT_CHECK_INIT,
  PAYMENT_CHECK_NET_ERR,
  PAYMENT_CHECK_RESP_ERR,
  PAYMENT_CHECK_SUCCESS,
  PAYMENT_CHECK_SVR_ERR,
} from '../utils/mixpanelHelperInit';
import { getConfigOrThrow } from '../utils/config';
import { PaymentSession } from '../sessionData/PaymentSession';
import { getUrlParameter } from './urlUtilities';

import { ErrorsType, errorHandler } from './errorhandler';

export async function actionsCheck() {
  document.body.classList.add('loading');

  // This instance on PM Client calls the  of PM
  const pmClient = createClient({
    baseUrl: getConfigOrThrow().IO_PAY_PAYMENT_MANAGER_HOST,
    fetchApi: retryingFetch(fetch, 2000 as Millisecond, 3),
  });
  // const checkData = checkdata;

  const checkDataStored: string | null = sessionStorage.getItem('checkData') || null;
  const idPaymentStored: string | null = checkDataStored ? JSON.parse(checkDataStored).idPayment : null;
  const idPaymentByQS: string | null = getUrlParameter('p') !== '' ? getUrlParameter('p') : null;
  const idPayment: string | null = checkDataStored != null ? JSON.parse(checkDataStored).idPayment : idPaymentByQS;
  const origin: string | null = getUrlParameter('origin') !== '' ? getUrlParameter('origin') : null;

  // Trying to avoid a new call to endpoint if we've data stored
  if (idPaymentStored === null) {
    mixpanel.track(PAYMENT_CHECK_INIT.value, { EVENT_ID: PAYMENT_CHECK_INIT.value, idPayment });
    fromNullable(idPayment).fold(
      // If undefined
      await tryCatch(
        () =>
          pmClient.checkPaymentUsingGET({
            id: fromNullable(idPayment).getOrElse(''),
          }),
        // Error on call
        e => {
          errorHandler(ErrorsType.CONNECTION);
          mixpanel.track(PAYMENT_CHECK_NET_ERR.value, { EVENT_ID: PAYMENT_CHECK_NET_ERR.value, e });
          return toError;
        },
      )
        .fold(
          r => {
            errorHandler(ErrorsType.SERVER);
            mixpanel.track(PAYMENT_CHECK_SVR_ERR.value, { EVENT_ID: PAYMENT_CHECK_SVR_ERR.value, r });
          },
          myResExt => {
            myResExt.fold(
              () => errorHandler(ErrorsType.GENERIC_ERROR),
              response => {
                const maybePayment = PaymentSession.decode(response.value?.data);

                if (response.status === 200 && maybePayment.isRight()) {
                  sessionStorage.setItem('checkData', JSON.stringify(maybePayment.value));
                  // TODO: #MIXEVENT PAYMENT_CHECK_SUCCESS
                  mixpanel.track(PAYMENT_CHECK_SUCCESS.value, {
                    EVENT_ID: PAYMENT_CHECK_SUCCESS.value,
                    idPayment: response?.value?.data?.idPayment,
                    amount: response?.value?.data?.amount,
                  });
                  sessionStorage.setItem(
                    'originUrlRedirect',
                    fromNullable(origin).getOrElse(response.value.data.urlRedirectEc),
                  );
                } else {
                  window.location.replace('ko.html');
                  mixpanel.track(PAYMENT_CHECK_RESP_ERR.value, {
                    EVENT_ID: PAYMENT_CHECK_RESP_ERR.value,
                    /* code: response.value,
                    message: response?.value.message, */
                    // In the else branch the response is not an error, so it
                    // doesn't have code and message properties
                    code: PAYMENT_CHECK_SVR_ERR.value,
                    message: `payment/check returned ${response.status}`,
                  });
                }
              },
            );
          },
        )
        .run(),
      () => undefined,
    );
  }
  document.body.classList.remove('loading');
}
