import { Millisecond } from 'italia-ts-commons/lib/units';
import { PaymentManagerClient } from '../pagopa';
import { defaultRetryingFetch } from '../../utils/fetch';

// Client for the PagoPA PaymentManager
describe('my suite', () => {
  const paymentManagerClient = PaymentManagerClient(
    'ciao', // put the url
    'walletToken',
    defaultRetryingFetch(),
    defaultRetryingFetch(20000 as Millisecond, 0),
  );
  it('should be defined', () => {
    expect(paymentManagerClient).toBeTruthy();
  });
});
