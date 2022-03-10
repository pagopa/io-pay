/* eslint-disable complexity */
import { toError } from 'fp-ts/lib/Either';
import * as TE from 'fp-ts/lib/TaskEither';
import { Millisecond } from 'italia-ts-commons/lib/units';
import { fromNullable } from 'fp-ts/lib/Option';

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
import { buttonDisabler, buttonEnabler } from './js/buttonutils';

const conf = getConfigOrThrow();

const iopayportalClient: IoPayPortalClient.Client = IoPayPortalClient.createClient({
  baseUrl: conf.IO_PAY_FUNCTIONS_HOST,
  fetchApi: retryingFetch(fetch, conf.IO_PAY_API_TIMEOUT as Millisecond, 3),
});

const pmClient: PmClient.Client = PmClient.createClient({
  baseUrl: conf.IO_PAY_PAYMENT_MANAGER_HOST,
  fetchApi: retryingFetch(fetch, conf.IO_PAY_API_TIMEOUT as Millisecond, 3),
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
  const checkoutFormSubmit = checkoutForm?.querySelectorAll("button[type='submit']")
    ? checkoutForm.querySelectorAll("button[type='submit']")[0]
    : null;

  const fixedCost: number = wallet?.psp.fixedCost.amount || 0;
  const amount: number | null = checkData?.amount.amount;
  const totAmount: number = fixedCost >= 0 && amount ? fixedCost + amount : 0;
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
    checkTotamount.innerText = `€ ${Intl.NumberFormat('it-IT', { minimumFractionDigits: 2 }).format(
      +(prettyAmount || '0'),
    )}`;
  }
  if (checkTotamountButton) {
    // eslint-disable-next-line functional/immutable-data
    checkTotamountButton.innerText = `€ ${Intl.NumberFormat('it-IT', { minimumFractionDigits: 2 }).format(
      +(prettyAmount || '0'),
    )}`;
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

      if (checkoutFormSubmit) {
        buttonDisabler(checkoutFormSubmit as HTMLButtonElement);
      }

      const browserInfo = (await getBrowserInfoTask(iopayportalClient).run()).getOrElse({
        ip: '',
        useragent: '',
        accept: '',
      });

      const threeDSData = {
        browserJavaEnabled: navigator.javaEnabled().toString(),
        browserLanguage: navigator.language,
        browserColorDepth: getEMVCompliantColorDepth(screen.colorDepth).toString(),
        browserScreenHeight: screen.height.toString(),
        browserScreenWidth: screen.width.toString(),
        browserTZ: new Date().getTimezoneOffset().toString(),
        browserAcceptHeader: browserInfo.accept,
        browserIP: browserInfo.ip,
        browserUserAgent: navigator.userAgent,
        acctID: `ACCT_${(JSON.parse(fromNullable(sessionStorage.getItem('wallet')).getOrElse('')) as Wallet).idWallet
          ?.toString()
          .trim()}`,
        deliveryEmailAddress: fromNullable(sessionStorage.getItem('useremail')).getOrElse(''),
        mobilePhone: null,
      };

      mixpanel.track(PAYMENT_PAY3DS2_INIT.value, {
        EVENT_ID: PAYMENT_PAY3DS2_INIT.value,
      });
      // Pay
      await TE.tryCatch(
        () =>
          pmClient.pay3ds2UsingPOST({
            Bearer: `Bearer ${sessionStorage.getItem('sessionToken')}`,
            id: checkData.idPayment,
            payRequest: {
              data: {
                tipo: 'web',
                idWallet: wallet.idWallet,
                cvv: fromNullable(sessionStorage.getItem('securityCode')).getOrElse(''),
                threeDSData: JSON.stringify(threeDSData),
              },
            },
            language: 'it',
          }),
        e => {
          errorHandler(ErrorsType.CONNECTION);
          if (checkoutFormSubmit) {
            buttonEnabler(checkoutFormSubmit as HTMLButtonElement);
          }
          mixpanel.track(PAYMENT_PAY3DS2_NET_ERR.value, { EVENT_ID: PAYMENT_PAY3DS2_NET_ERR.value });
          return toError;
        },
      )
        .fold(
          r => {
            errorHandler(ErrorsType.SERVER);
            if (checkoutFormSubmit) {
              buttonEnabler(checkoutFormSubmit as HTMLButtonElement);
            }
            mixpanel.track(PAYMENT_PAY3DS2_SVR_ERR.value, { EVENT_ID: PAYMENT_PAY3DS2_SVR_ERR.value });
          }, // to be replaced with logic to handle failures
          myResExt => {
            const paymentResp = myResExt.fold(
              () => 'fakePayment',
              myRes => {
                if (myRes.status === 200) {
                  mixpanel.track(PAYMENT_PAY3DS2_SUCCESS.value, {
                    EVENT_ID: PAYMENT_PAY3DS2_SUCCESS.value,
                  });
                  return JSON.stringify(myRes.value.data);
                } else {
                  errorHandler(ErrorsType.GENERIC_ERROR);
                  if (checkoutFormSubmit) {
                    buttonEnabler(checkoutFormSubmit as HTMLButtonElement);
                  }
                  mixpanel.track(PAYMENT_PAY3DS2_RESP_ERR.value, {
                    EVENT_ID: PAYMENT_PAY3DS2_RESP_ERR.value,
                  });
                  return 'fakePayment';
                }
              },
            );
            sessionStorage.setItem('idTransaction', JSON.parse(paymentResp).token);
            window.location.replace('response.html');
          },
        )
        .run();
    },
    false,
  );
});
