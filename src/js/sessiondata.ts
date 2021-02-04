import checkdata from '../assets/json/check.json';
import idpayguard from './idpayguard';
import { initHeader } from './header';

export function actionsCheck(): void {
  document.body.classList.add('loading');

  idpayguard();

  // TO-DO: implement call to endpoint
  const checkData = checkdata;
  initHeader(checkData);

  if (paymentIDStored == null && paymentID) {
    sessionStorage.setItem('paymentID', paymentID);
  }

  sessionStorage.setItem('checkData', JSON.stringify(checkData));
  document.body.classList.remove('loading');
}
