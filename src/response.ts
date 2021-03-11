import { debug } from 'console';
import { Millisecond } from 'italia-ts-commons/lib/units';
import { DeferredPromise } from 'italia-ts-commons/lib/promises';
import { fromNullable, none } from 'fp-ts/lib/Option';
import { toError } from 'fp-ts/lib/Either';
import { fromPredicate } from 'fp-ts/lib/TaskEither';
import { Client, createClient } from '../generated/definitions/pagopa/client';
import { TransactionStatusResponse } from '../generated/definitions/pagopa/TransactionStatusResponse';
import { getUrlParameter } from './js/urlUtilities';
import idpayguard from './js/idpayguard';
import { initHeader } from './js/header';
import { setTranslateBtns } from './js/translateui';
import { initDropdowns } from './js/dropdowns';
import { constantPollingWithPromisePredicateFetch, retryingFetch } from './utils/fetch';
import {
  getStringFromSessionStorageTask,
  resumeTransactionTask,
  checkStatusTask,
} from './utils/transactionHelper';
import { start3DS2MethodStep, createIFrame, start3DS2AcsChallengeStep } from './utils/iframe';
import {
  THREEDSACSCHALLENGEURL_STEP2_RESP_ERR,
  THREEDSACSCHALLENGEURL_STEP2_SUCCESS,
  THREEDSMETHODURL_STEP1_RESP_ERR,
  THREEDSMETHODURL_STEP1_SUCCESS,
} from './utils/mixpanelHelperInit';
import { mixpanel } from './__mocks__/mocks';
import { GENERIC_STATUS, TX_ACCEPTED } from './utils/TransactionStatesTypes';
import { getConfigOrThrow } from './utils/config';

const config = getConfigOrThrow();

const showErrorStatus = () => {
  document.body.classList.remove('loadingOperations');
  document
    .querySelectorAll('[data-response]')
    .forEach(i => (i.getAttribute('data-response') === '3' ? null : i.remove()));
  (document.getElementById('response__continue') as HTMLElement).setAttribute(
    'href',
    fromNullable(sessionStorage.getItem('originUrlRedirect')).getOrElse('#'),
  );
};

const showSuccessStatus = (idStatus: GENERIC_STATUS) => {
  document.body.classList.remove('loadingOperations');
  TX_ACCEPTED.decode(idStatus).map(_ =>
    document
      .querySelectorAll('[data-response]')
      .forEach(i => (i.getAttribute('data-response') === '1' ? null : i.remove())),
  );
  (document.getElementById('response__continue') as HTMLElement).setAttribute(
    'href',
    fromNullable(sessionStorage.getItem('originUrlRedirect')).getOrElse('#'),
  );
};

/**
 * Polling configuration params
 */
const retries: number = 10;
const delay: number = 3000;
const timeout: Millisecond = 20000 as Millisecond;

/**
 * Payment Manager Client with polling until the transaction has the methodUrl
 * and it is in a non final state.
 */
const paymentManagerClientWithPollingOnMethod: Client = createClient({
  baseUrl: config.IO_PAY_PAYMENT_MANAGER_HOST,
  fetchApi: constantPollingWithPromisePredicateFetch(
    DeferredPromise<boolean>().e1,
    retries,
    delay,
    timeout,
    async (r: Response): Promise<boolean> => {
      const myJson = (await r.clone().json()) as TransactionStatusResponse;
      return myJson.data.finalStatus === false && fromNullable(myJson.data.methodUrl).isNone();
    },
  ),
});

/**
 * Payment Manager Client with polling until the transaction has the acsUrl
 * and it is in a non final state
 */
const paymentManagerClientWithPollingOnPreAcs: Client = createClient({
  baseUrl: config.IO_PAY_PAYMENT_MANAGER_HOST,
  fetchApi: constantPollingWithPromisePredicateFetch(
    DeferredPromise<boolean>().e1,
    retries,
    delay,
    timeout,
    async (r: Response): Promise<boolean> => {
      const myJson = (await r.clone().json()) as TransactionStatusResponse;
      return myJson.data.finalStatus === false && fromNullable(myJson.data.acsUrl).isNone();
    },
  ),
});

/**
 * Payment Manager Client with polling until the transaction is in a final state.
 */
const paymentManagerClientWithPollingOnFinalStatus: Client = createClient({
  baseUrl: config.IO_PAY_PAYMENT_MANAGER_HOST,
  fetchApi: constantPollingWithPromisePredicateFetch(
    DeferredPromise<boolean>().e1,
    retries,
    delay,
    timeout,
    async (r: Response): Promise<boolean> => {
      const myJson = (await r.clone().json()) as TransactionStatusResponse;
      return r.status === 200 && myJson.data.finalStatus === false;
    },
  ),
});

/**
 * Payment Manager Client.
 */
const pmClient: Client = createClient({
  baseUrl: config.IO_PAY_PAYMENT_MANAGER_HOST,
  fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
});

// eslint-disable-next-line sonarjs/cognitive-complexity
document.addEventListener('DOMContentLoaded', async () => {
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

  // 2. METHOD RESUME and ACS CHALLENGE step on 3ds2
  window.addEventListener(
    'message',
    async function (e) {
      await fromPredicate<Error, MessageEvent<any>>(
        // Addresses must be static
        e1 => e1.origin === config.IO_PAY_FUNCTIONS_HOST && e1.data === '3DS.Notification.Received',
        toError,
      )(e)
        .fold(
          _ =>
            mixpanel.track(THREEDSMETHODURL_STEP1_RESP_ERR.value, {
              EVENT_ID: THREEDSMETHODURL_STEP1_RESP_ERR.value,
              ORIGIN: e.origin,
              RESPONSE: e.data,
              token: '',
            }), // TODO error handle
          _ => {
            mixpanel.track(THREEDSMETHODURL_STEP1_SUCCESS.value, {
              EVENT_ID: THREEDSMETHODURL_STEP1_SUCCESS.value,
              token: '',
            });
            void getStringFromSessionStorageTask('idTransaction')
              .chain(idTransaction =>
                getStringFromSessionStorageTask('sessionToken')
                  .chain(sessionToken => resumeTransactionTask('Y', sessionToken, idTransaction, pmClient))
                  .chain(_ => checkStatusTask(idTransaction, paymentManagerClientWithPollingOnPreAcs)),
              )

              .fold(
                _ => debug('To handle error'),
                transactionStatus =>
                  start3DS2AcsChallengeStep(
                    transactionStatus.data.acsUrl,
                    transactionStatus.data.params,
                    document.body,
                  ),
              )
              .run();
          },
        )
        .run();
    },

    false,
  );

  await fromPredicate<Error, string>(
    idTransaction => idTransaction !== '',
    toError,
  )(getUrlParameter('id'))
    .fold(
      async _ => {
        // 1. METHOD step on 3ds2
        await getStringFromSessionStorageTask('idTransaction')
          .chain(idTransaction => checkStatusTask(idTransaction, paymentManagerClientWithPollingOnMethod))
          .fold(
            () => undefined,
            transactionStatus =>
              fromNullable(transactionStatus.data.threeDSMethodData).fold(none, threeDSMethodData => {
                sessionStorage.setItem('threeDSMethodData', threeDSMethodData);
                return start3DS2MethodStep(
                  transactionStatus.data.methodUrl,
                  transactionStatus.data.threeDSMethodData,
                  createIFrame(document.body, 'myIdFrame', 'myFrameName'),
                );
              }),
          )
          .run();
      },
      // 3. ACS RESUME and CHECK FINAL STATUS POLLING step on 3ds2
      async idTransaction => {
        await getStringFromSessionStorageTask('sessionToken')
          .chain(sessionToken => resumeTransactionTask(undefined, sessionToken, idTransaction, pmClient))
          .chain(_ => checkStatusTask(idTransaction, paymentManagerClientWithPollingOnFinalStatus))

          .fold(
            _ => {
              mixpanel.track(THREEDSACSCHALLENGEURL_STEP2_RESP_ERR.value, {
                EVENT_ID: THREEDSACSCHALLENGEURL_STEP2_RESP_ERR.value,
                token: idTransaction,
              });
              showErrorStatus();
            },
            transactionStatusResponse => {
              mixpanel.track(THREEDSACSCHALLENGEURL_STEP2_SUCCESS.value, {
                EVENT_ID: THREEDSACSCHALLENGEURL_STEP2_SUCCESS.value,
                token: idTransaction,
              });
              showSuccessStatus(transactionStatusResponse.data.idStatus);
            },
          )
          .run();
      },
    )
    .run();
});
