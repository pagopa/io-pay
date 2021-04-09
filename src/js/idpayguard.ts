import { getUrlParameter } from './urlUtilities';

// PaymentID: from sessionstorage or by querystring
export default function idpayguard(): void {
  const paymentIDStored: string | null = sessionStorage.getItem('checkData') || null;
  const paymentByQS: string | null = getUrlParameter('p') !== '' ? getUrlParameter('p') : null;
  const paymentID: string | null = paymentIDStored !== null ? JSON.parse(paymentIDStored).idPayment : paymentByQS;
  if (paymentID === null) {
    window.location.replace('ko.html');
  }
}
