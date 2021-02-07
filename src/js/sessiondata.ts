import { Millisecond } from 'italia-ts-commons/lib/units';
import { fromNullable } from 'fp-ts/lib/Option';
import { toError } from 'fp-ts/lib/Either';
import { tryCatch } from 'fp-ts/lib/TaskEither';
import { createClient } from '../../generated/definitions/pagopa/client';
import { retryingFetch } from '../utils/fetch';
import { getUrlParameter } from './urlUtilities';

export async function actionsCheck() {
  document.body.classList.add('loading');

  // This instance on PM Client calls the  of PM
  const pmClient = createClient({
    baseUrl: 'http://localhost:8080',
    fetchApi: retryingFetch(fetch, 2000 as Millisecond, 3),
  });
  // const checkData = checkdata;

  const paymentIDStored: string | null = sessionStorage.getItem('paymentID');
  const paymentByQS: string | null = getUrlParameter('p') !== '' ? getUrlParameter('p') : null;
  const paymentID: string | null = paymentIDStored != null ? paymentIDStored : paymentByQS;

  fromNullable(paymentID).fold(
    // If undefined
    await tryCatch(
      () =>
        pmClient.checkPaymentUsingGET({
          id: fromNullable(paymentByQS).getOrElse(''),
        }),
      toError,
    )
      .fold(
        () => undefined, // MANAGE ERRORS
        myResExt => {
          sessionStorage.setItem(
            'checkData',
            myResExt.fold(
              () => 'fakeChekData',
              myRes => (myRes.status === 200 ? JSON.stringify(myRes.value.data) : 'fakeCheckData'),
            ),
          );
          sessionStorage.setItem(
            'paymentID',
            myResExt.fold(
              () => 'fakePaymentID',
              myRes => (myRes.status === 200 ? myRes.value.data.idPayment : 'fakePaymentID'),
            ),
          );
        },
      )
      .run(),
    () => undefined,
  );

  document.body.classList.remove('loading');
}
