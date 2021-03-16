import { getUrlParameter } from './urlUtilities';

// PaymentID: from sessionstorage or by querystring
export default function idpayguard(): void {
  const idPayment = JSON.parse(sessionStorage.getItem('checkData') || '').idPayment;
  const paymentIDStored: string | null = idPayment || null;
  const paymentByQS: string | null = getUrlParameter('p') !== '' ? getUrlParameter('p') : null;
  const paymentID: string | null = paymentIDStored !== null ? paymentIDStored : paymentByQS;
  if (paymentID === null) {
    window.location.replace('ko.html');
  }
}
