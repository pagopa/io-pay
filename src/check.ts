/* eslint-disable complexity */
import { modalWindows } from './js/modals';
import idpayguard from './js/idpayguard';
import { initHeader } from './js/header';
import { setTranslateBtns } from './js/translateui';

// eslint-disable-next-line sonarjs/cognitive-complexity
document.addEventListener('DOMContentLoaded', () => {
  // idpayguard
  idpayguard();
  // initHeader
  initHeader();
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
});
