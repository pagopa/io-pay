import { debug } from 'console';
import { Millisecond } from 'italia-ts-commons/lib/units';
import { DeferredPromise } from 'italia-ts-commons/lib/promises';
import { Client, createClient } from '../generated/definitions/pagopa/client';
import { TransactionStatusResponse } from '../generated/definitions/pagopa/TransactionStatusResponse';
import idpayguard from './js/idpayguard';
import { initHeader } from './js/header';
import { setTranslateBtns } from './js/translateui';
import { initDropdowns } from './js/dropdowns';
import { constantPollingWithPromisePredicateFetch } from './utils/fetch';
import { checkMethodTask, getDataFromSessionStorageTask } from './utils/transactionHelper';
import { start3DS2MethodStep, createIFrame } from './utils/iframe';

// eslint-disable-next-line sonarjs/cognitive-complexity
document.addEventListener('DOMContentLoaded', async () => {
  const retries: number = 10;
  const delay: number = 3000;
  const timeout: Millisecond = 20000 as Millisecond;

  const paymentManagerClientWithPollingOnMethod: Client = createClient({
    baseUrl: 'http://localhost:8080',
    fetchApi: constantPollingWithPromisePredicateFetch(
      DeferredPromise<boolean>().e1,
      retries,
      delay,
      timeout,
      async (r: Response): Promise<boolean> => {
        const myJson = (await r.clone().json()) as TransactionStatusResponse;
        // Stop the polling when this condition is false
        return myJson.data.idStatus !== 15;
      },
    ),
  });
  /*
  const pmClient: Client = createClient({
    baseUrl: 'http://localhost:8080',
    fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
  }); */

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

  window.addEventListener(
    'message',
    async function (e) {
      // Addresses must be static
      if (e.origin !== 'http://localhost:7071' || e.data !== '3DS.Notification.Received') {
        return;
      } else {
        debug('MESSAGE RECEIVED: ', e.data);
        // TODO: ADD RESUME3DS2('Y', sessionStorage.get(threeDSMethodData))
        //  trycatch(...).
        // .chain(transactionStatus => check3ds2Task(transaction.token, pmClientPollingOnChallenge)).
        // .fold(left, xxtransaction => start3ds2ChallengeStep(xxtransaction.data.acsUrl,
        // xxtransaction.data.cres), document.body).run();
      }
    },

    false,
  );

  await getDataFromSessionStorageTask('payment')
    .chain(transaction => checkMethodTask(transaction.token, paymentManagerClientWithPollingOnMethod))
    .fold(
      () => undefined,
      myTransaction =>
        // TODO: persist threeDSMethodData in session storage
        start3DS2MethodStep(
          myTransaction.data.methodUrl,
          myTransaction.data.threeDSMethodData,
          createIFrame(document.body, 'myIdFrame', 'myFrameName'),
        ),
    )
    .run();

  // clear sessionStorage
  sessionStorage.clear();
});
