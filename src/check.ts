/* eslint-disable complexity */
import { toError } from 'fp-ts/lib/Either';
import * as TE from 'fp-ts/lib/TaskEither';
import { Millisecond } from 'italia-ts-commons/lib/units';
import { fromNullable } from 'fp-ts/lib/Option';
import { createClient, Client } from '../generated/definitions/pagopa/client';
import { modalWindows } from './js/modals';
import idpayguard from './js/idpayguard';
import { initHeader } from './js/header';
import { setTranslateBtns } from './js/translateui';
import { retryingFetch } from './utils/fetch';
import { initDropdowns } from './js/dropdowns';

// eslint-disable-next-line sonarjs/cognitive-complexity
document.addEventListener('DOMContentLoaded', () => {
  const pmClient: Client = createClient({
    baseUrl: 'http://localhost:8080',
    fetchApi: retryingFetch(fetch, 2000 as Millisecond, 3),
  });

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

  const circuitCustomType = document.querySelector('.windowcont__recapcc__circuit--custom use');
  const circuitCustomEl = document.querySelector('.windowcont__recapcc__circuit--custom');
  const circuitDefaultEl = document.querySelector('.windowcont__recapcc__circuit');
  const circuitCustomTypeHref = circuitCustomType?.getAttribute('href');

  const checkTotamount = document.getElementById('check__totamount');
  const checkTotamountButton = document.getElementById('check__totamount__button');
  const checkCreditcardname = document.getElementById('check__creditcardname');
  const checkCreditcardexpirationdate = document.getElementById('check__creditcardexpirationdate');
  const checkCreditcardnumber = document.getElementById('check__creditcardnumber');
  const pspbank = document.getElementById('check__pspbank');
  const pspbankname = document.getElementsByClassName('check__pspbankname');
  const pspcost = document.getElementById('check__pspcost');
  const pspchoose = document.getElementById('check__pspchoose');
  const checkUserEmail = document.getElementById('check__useremail');

  const checkoutForm = document.getElementById('checkout');

  const fixedCost: number = wallet?.psp.fixedCost.amount || 0;
  const amount: number | null = checkData?.amount.amount;
  const totAmount: number = fixedCost && amount ? fixedCost + amount : 0;
  const prettyAmount: number = totAmount / 100;
  const prettyfixedCost: number = fixedCost / 100;

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
    // eslint-disable-next-line functional/immutable-data
    checkCreditcardnumber.innerText = wallet.creditCard.pan;
  }
  if (pspbank && wallet) {
    // eslint-disable-next-line functional/immutable-data
    pspbank.setAttribute('src', wallet.psp.logoPSP);
  }
  if (pspcost && wallet) {
    // eslint-disable-next-line functional/immutable-data
    pspcost.innerText = `€ ${Intl.NumberFormat('it-IT').format(+(prettyfixedCost || '0'))}`;
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
  if (pspchoose && wallet && wallet.pspEditable === false) {
    pspchoose.classList.add('d-none');
  }

  checkoutForm?.addEventListener(
    'submit',
    async function (e) {
      e.preventDefault();

      // Pay
      await TE.tryCatch(
        () =>
          pmClient.pay3ds2UsingPOST({
            Bearer: `Bearer ${sessionStorage.getItem('sessionToken')}`,
            id: checkData.idPayment,
            payRequest: {
              data: {
                idWallet: wallet.idWallet,
                cvv: fromNullable(sessionStorage.getItem('securityCode')).getOrElse(''),
              },
            },
            language: 'it',
          }),
        toError,
      )
        .fold(
          () => void 0, // to be replaced with logic to handle failures
          myResExt => {
            const paymentResp = myResExt.fold(
              () => 'fakePayment',
              myRes => (myRes.status === 200 ? JSON.stringify(myRes.value.data) : 'fakePayment'),
            );
            sessionStorage.setItem('payment', paymentResp);
            // window.location.replace('response.html');
            window.location.replace(JSON.parse(paymentResp).urlCheckout3ds);
          },
        )
        .run();
    },
    false,
  );
});
