import { getUrlParameter } from './urlUtilities';

// PaymentID: from sessionstorage or by querystring
export default function idpayguard(): void {
  const paymentIDStored: string | null = sessionStorage.getItem('paymentID');
  const paymentByQS: string | null = getUrlParameter('p') !== '' ? getUrlParameter('p') : null;
  const paymentID: string | null = paymentIDStored != null ? paymentIDStored : paymentByQS;
  if (!paymentID) {
    // TO-DO
    alert('TO-DO prevedere exit in caso non ci sia paymentid');
  }
}
