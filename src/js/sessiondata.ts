import { Millisecond } from 'italia-ts-commons/lib/units';
import { fromNullable } from 'fp-ts/lib/Option';
import { tryCatch } from 'fp-ts/lib/TaskEither';
import { toError } from 'fp-ts/lib/Either';
import { createClient } from '../../generated/definitions/pagopa/client';
import { retryingFetch } from '../utils/fetch';
import { track } from '../__mocks__/mocks';
import {
  PAYMENT_CHECK_INIT,
  PAYMENT_CHECK_NET_ERR,
  PAYMENT_CHECK_RESP_ERR,
  PAYMENT_CHECK_SUCCESS,
  PAYMENT_CHECK_SVR_ERR,
} from '../utils/mixpanelHelperInit';
import { getUrlParameter } from './urlUtilities';

export async function actionsCheck() {
  document.body.classList.add('loading');

  // This instance on PM Client calls the  of PM
  const pmClient = createClient({
    baseUrl: 'http://localhost:8080',
    fetchApi: retryingFetch(fetch, 2000 as Millisecond, 3),
  });
  // const checkData = checkdata;

  const checkDataStored: string | null = sessionStorage.getItem('checkData') || null;
  const idPaymentStored: string | null = checkDataStored ? JSON.parse(checkDataStored).idPayment : null;
  const idPaymentByQS: string | null = getUrlParameter('p') !== '' ? getUrlParameter('p') : null;
  const idPayment: string | null = checkDataStored != null ? JSON.parse(checkDataStored).idPayment : idPaymentByQS;
  // Trying to avoid a new call to endpoint if we've data stored
  if (idPaymentStored === null) {
    track(PAYMENT_CHECK_INIT.value, { EVENT_ID: PAYMENT_CHECK_INIT.value, idPayment });
    fromNullable(idPayment).fold(
      // If undefined
      await tryCatch(
        () =>
          pmClient.checkPaymentUsingGET({
            id: fromNullable(idPayment).getOrElse(''),
          }),
        // Error on call
        e => {
          // TODO: #RENDERING_ERROR
          track(PAYMENT_CHECK_NET_ERR.value, { EVENT_ID: PAYMENT_CHECK_NET_ERR.value, e });
          return toError;
        },
      )
        .fold(
          r => {
            // TODO: #RENDERING_ERROR
            track(PAYMENT_CHECK_SVR_ERR.value, { EVENT_ID: PAYMENT_CHECK_SVR_ERR.value, r });
          },
          myResExt => {
            myResExt.fold(
              () => undefined, // empty data ???
              response => {
                if (response.status === 200) {
                  sessionStorage.setItem('checkData', JSON.stringify(response.value.data));
                  // TODO: #MIXEVENT PAYMENT_CHECK_SUCCESS
                  track(PAYMENT_CHECK_SUCCESS.value, {
                    EVENT_ID: PAYMENT_CHECK_SUCCESS.value,
                    idPayment: response?.value?.data?.idPayment,
                    amount: response?.value?.data?.amount,
                  });
                } else {
                  // TODO: missinig else #RENDERING_ERROR
                  track(PAYMENT_CHECK_RESP_ERR.value, {
                    EVENT_ID: PAYMENT_CHECK_RESP_ERR.value,
                    code: response?.value.code,
                    message: response?.value.message,
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
