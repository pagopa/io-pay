import { debug as cdebug } from 'console';
import { Millisecond } from 'italia-ts-commons/lib/units';
import { PaymentManagerClient } from '../pagopa';
import { defaultRetryingFetch } from '../../utils/fetch';

// Client for the PagoPA PaymentManager
describe('my suite', () => {
  cdebug('PRIMA');
  /* const paymentManagerClient = PaymentManagerClient(
    'https://acardste.vaservices.eu', // put the url
    'walletToken',
    defaultRetryingFetch(5000 as Millisecond, 5),
    defaultRetryingFetch(20000 as Millisecond, 0),
  ); */
  const paymentManagerClient = PaymentManagerClient(
    'https://acardste.vaservices.eu', // put the url
    'walletToken',
    defaultRetryingFetch(5000 as Millisecond, 5),
    defaultRetryingFetch(20000 as Millisecond, 0),
  );
  cdebug('DOPO');
  it('should be defined', () => {
    expect(paymentManagerClient).toBeTruthy();
  });
});
