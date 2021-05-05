/* eslint-disable complexity */
import { toError } from 'fp-ts/lib/Either';
import * as TE from 'fp-ts/lib/TaskEither';
import { Millisecond } from 'italia-ts-commons/lib/units';
import { fromNullable } from 'fp-ts/lib/Option';

import { NonEmptyString } from 'italia-ts-commons/lib/strings';
import { response } from 'express';
import * as PmClient from '../generated/definitions/pagopa/client';
import * as IoPayPortalClient from '../generated/definitions/iopayportal/client';
import { Wallet } from '../generated/definitions/pagopa/Wallet';
import { modalWindows } from './js/modals';
import idpayguard from './js/idpayguard';
import { initHeader } from './js/header';
import { setTranslateBtns } from './js/translateui';
import { retryingFetch } from './utils/fetch';
import { initDropdowns } from './js/dropdowns';
import {
  mixpanel,
  PAYMENT_PAY3DS2_INIT,
  PAYMENT_PAY3DS2_NET_ERR,
  PAYMENT_PAY3DS2_RESP_ERR,
  PAYMENT_PAY3DS2_SUCCESS,
  PAYMENT_PAY3DS2_SVR_ERR,
} from './utils/mixpanelHelperInit';

import { getConfigOrThrow } from './utils/config';
import { ErrorsType, errorHandler } from './js/errorhandler';
import { getBrowserInfoTask, getEMVCompliantColorDepth } from './utils/checkHelper';
import { payTask } from './tasks/payTask';

const iopayportalClient: IoPayPortalClient.Client = IoPayPortalClient.createClient({
  baseUrl: getConfigOrThrow().IO_PAY_FUNCTIONS_HOST,
  fetchApi: retryingFetch(fetch, 2000 as Millisecond, 3),
});

const pmClient: PmClient.Client = PmClient.createClient({
  baseUrl: getConfigOrThrow().IO_PAY_PAYMENT_MANAGER_HOST,
  fetchApi: retryingFetch(fetch, 2000 as Millisecond, 3),
});

// eslint-disable-next-line sonarjs/cognitive-complexity
document.addEventListener('DOMContentLoaded', async () => {
  // idpayguard
  idpayguard();
  // initHeader
  initHeader();
  // initDropdowns
  initDropdowns();
  // init translations
  setTranslateBtns();
  // init modals
  modalWindows();

  const walletStored = sessionStorage.getItem('wallet') || '';
  const checkDataStored = sessionStorage.getItem('checkData') || '';
  const wallet = JSON.parse(walletStored);
  const checkData = JSON.parse(checkDataStored);
  const userEmail = sessionStorage.getItem('useremail') || '';

  const checkTotamount = document.getElementById('check__totamount');
  const checkTotamountButton = document.getElementById('check__totamount__button');
  const checkCreditcardname = document.getElementById('check__creditcardname');
  const checkCreditcardexpirationdate = document.getElementById('check__creditcardexpirationdate');
  const checkCreditcardnumber = document.getElementById('check__creditcardnumber');
  const checkCreditcardnumberScreenReader = document.getElementById('check__creditcardnumber__sr');
  const pspbank = document.getElementById('check__pspbank');
  const pspbankname = document.getElementsByClassName('check__pspbankname');
  const pspcost = document.getElementById('check__pspcost');
  const checkUserEmail = document.getElementById('check__useremail');

  const checkoutForm = document.getElementById('checkout');

  const fixedCost: number = wallet?.psp.fixedCost.amount || 0;
  const amount: number | null = checkData?.amount.amount;
  const totAmount: number = fixedCost && amount ? fixedCost + amount : 0;
  const prettyAmount: number = totAmount / 100;
  const prettyfixedCost: number = fixedCost / 100;

  if (wallet.creditCard.brand) {
    const brand = wallet.creditCard.brand.toLowerCase();
    const cchandler = `use.ccicon--custom.${brand}`;
    const cccircuitEl = document.querySelector(cchandler);
    if (cccircuitEl) {
      cccircuitEl.classList.remove('d-none');
    }
  }

  if (checkTotamount) {
    // eslint-disable-next-line functional/immutable-data
    checkTotamount.innerText = `€ ${Intl.NumberFormat('it-IT').format(+(prettyAmount || '0'))}`;
  }
  if (checkTotamountButton) {
    // eslint-disable-next-line functional/immutable-data
    checkTotamountButton.innerText = `€ ${Intl.NumberFormat('it-IT').format(+(prettyAmount || '0'))}`;
  }
  if (checkCreditcardname && wallet) {
    // eslint-disable-next-line functional/immutable-data
    checkCreditcardname.innerText = wallet.creditCard.holder;
  }
  if (checkCreditcardexpirationdate && wallet) {
    // eslint-disable-next-line functional/immutable-data
    checkCreditcardexpirationdate.innerText = `${wallet.creditCard.expireMonth}/${wallet?.creditCard.expireYear}`;
  }
  if (checkCreditcardnumber && wallet) {
    const panOnlyNumbers = wallet.creditCard.pan.replaceAll('*', '');
    const panDotted = `&middot;&middot;&middot;&middot;${panOnlyNumbers}`;
    // eslint-disable-next-line functional/immutable-data
    checkCreditcardnumber.innerHTML = panDotted;
  }
  if (checkCreditcardnumberScreenReader && wallet) {
    // eslint-disable-next-line functional/immutable-data
    checkCreditcardnumberScreenReader.innerText = wallet.creditCard.pan.replaceAll('*', '');
  }
  if (pspbank && wallet) {
    // eslint-disable-next-line functional/immutable-data
    pspbank.setAttribute('src', wallet.psp.logoPSP);
    pspbank.setAttribute('alt', wallet.psp.businessName);
  }
  if (pspcost && wallet) {
    // eslint-disable-next-line functional/immutable-data
    pspcost.innerText = `€ ${Intl.NumberFormat('it-IT', { minimumFractionDigits: 2 }).format(
      +(prettyfixedCost || '0'),
    )}`;
  }
  if (pspbankname && wallet) {
    const bankArray = Array.from(pspbankname);
    for (const el of bankArray) {
      // eslint-disable-next-line functional/immutable-data
      (el as HTMLElement).innerText = wallet.psp.businessName;
    }
  }
  if (checkUserEmail && userEmail) {
    // eslint-disable-next-line functional/immutable-data
    checkUserEmail.innerText = userEmail;
  }

  checkoutForm?.addEventListener(
    'submit',
    async function (e) {
      e.preventDefault();

      mixpanel.track(PAYMENT_PAY3DS2_INIT.value, {
        EVENT_ID: PAYMENT_PAY3DS2_INIT.value,
        idPayment: checkData.idPayment,
      });

      await payTask(
        checkData.idPayment,
        wallet.idWallet,
        fromNullable(sessionStorage.getItem('sessionToken')).getOrElse(''),
        navigator.javaEnabled().toString(),
        navigator.language,
        getEMVCompliantColorDepth(screen.colorDepth).toString(),
        screen.height.toString(),
        screen.width.toString(),
        new Date().getTimezoneOffset().toString(),
        navigator.userAgent,
        fromNullable(sessionStorage.getItem('useremail')).getOrElse(''),
        '',
        'web',
        fromNullable(sessionStorage.getItem('securityCode')).getOrElse(''),
        'it',
      )
        .fold(
          error => {
            errorHandler(error.type);
            mixpanel.track(error.event, { EVENT_ID: error.event, detail: error.detail });
          },
          response => {
            mixpanel.track(PAYMENT_PAY3DS2_SUCCESS.value, {
              EVENT_ID: PAYMENT_PAY3DS2_SUCCESS.value,
              token: response.data.token,
              idStatus: response.data.idStatus,
              statusMessage: response.data.statusMessage,
              idPayment: response.data.nodoIdPayment,
            });
            sessionStorage.setItem('idTransaction', response.data.token);
            window.location.replace('response.html');
          },
        )
        .run();
    },
    false,
  );
});
