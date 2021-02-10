import { getIdPayment } from '../utils/testUtils';

describe('getIdPayment utility function', () => {
  it('should return a chackable idPayment', async () => {
    expect(/[\d\w]{8}(-[\d\w]{4}){3}-[\d\w]{12}/.test(await getIdPayment('localhost', '8081'))).toBeTruthy();
  });
});
