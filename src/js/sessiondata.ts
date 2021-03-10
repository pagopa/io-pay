import { Millisecond } from 'italia-ts-commons/lib/units';
import { fromNullable } from 'fp-ts/lib/Option';
import { toError } from 'fp-ts/lib/Either';
import { tryCatch } from 'fp-ts/lib/TaskEither';
import { createClient } from '../../generated/definitions/pagopa/client';
import { retryingFetch } from '../utils/fetch';
import { getConfigOrThrow } from '../utils/config';
import { getUrlParameter } from './urlUtilities';

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
    fromNullable(idPayment).fold(
      // If undefined
      await tryCatch(
        () =>
          pmClient.checkPaymentUsingGET({
            id: fromNullable(idPayment).getOrElse(''),
          }),
        toError,
      )
        .fold(
          () => undefined, // MANAGE ERRORS
          myResExt => {
            myResExt.fold(
              () => undefined,
              response => {
                if (response.status === 200) {
                  sessionStorage.setItem('checkData', JSON.stringify(response.value.data));
                  sessionStorage.setItem(
                    'originUrlRedirect',
                    fromNullable(origin).getOrElse(response.value.data.urlRedirectEc),
                  );
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
