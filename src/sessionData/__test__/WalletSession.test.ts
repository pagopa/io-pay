import { WalletSession } from '../WalletSession';

afterEach(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
});

describe('WalletSession encode/decode', () => {
  it('should return isDirectAcquirer', async () => {
    // set isDirectAcquirer to decide the final outcome
    const isDirectAcquirer: boolean | undefined = WalletSession.decode(
      JSON.parse(
        '{"idWallet":5,"type":"CREDIT_CARD","creditCard":{"holder":"Mario Rossi","pan":"************0101","expireMonth":"12","expireYear":"30","brand":"OTHER"},"psp":{"businessName":"Psp NEXI 2","logoPSP":"http://pagopa-dev:8080/pp-restapi/v4/resources/psp/22","fixedCost":{"currency":"EUR","amount":111,"decimalDigits":2},"serviceAvailability":"NEXI","directAcquirer":true},"pspEditable":false}',
      ),
    ).fold(
      _ => undefined,
      wallet => wallet.psp.directAcquirer,
    );

    expect(isDirectAcquirer).toEqual(true);
  });
});
