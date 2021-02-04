import checkdata from '../assets/json/check.json';
import idpayguard from './idpayguard';
import { initHeader } from './header';
import { getUrlParameter } from './urlUtilities';

export function actionsCheck(): void {
  document.body.classList.add('loading');

  idpayguard();

  // TO-DO: implement call to endpoint
  const checkData = checkdata;
  initHeader(checkData);

  const paymentIDStored: string | null = sessionStorage.getItem('paymentID');
  const paymentByQS: string | null = getUrlParameter('p') !== '' ? getUrlParameter('p') : null;
  const paymentID: string | null = paymentIDStored != null ? paymentIDStored : paymentByQS;

  if (paymentIDStored == null && paymentID) {
    sessionStorage.setItem('paymentID', paymentID);
  }

  sessionStorage.setItem('checkData', JSON.stringify(checkData));
  document.body.classList.remove('loading');
}
