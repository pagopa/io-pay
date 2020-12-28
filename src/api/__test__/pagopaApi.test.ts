import { Millisecond } from 'italia-ts-commons/lib/units';
import { PaymentManagerClient } from '../pagopa';
import { defaultRetryingFetch } from '../../utils/fetch';

// Client for the PagoPA PaymentManager
describe('my suite', () => {
  const paymentManagerClient = PaymentManagerClient(
    'https://acardste.vaservices.eu:443/pp-restapi-CD',
    'ZXCVBNM098876543',
    defaultRetryingFetch(5000 as Millisecond, 5),
    defaultRetryingFetch(20000 as Millisecond, 0),
  );
  it('should be defined', () => {
    expect(paymentManagerClient).toBeTruthy();
  });
  it('should call getSession', async () => {
    const responseP = paymentManagerClient.getSession('ZXCVBNM098876543');
    await expect(responseP).rejects.toEqual(Error('Promise has been rejected'));
  });
});
