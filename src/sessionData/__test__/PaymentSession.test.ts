import { PaymentSession } from '../PaymentSession';

afterEach(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
});

describe('PaymentSession encode/decode', () => {
  it('Should successfully decode response with empty fiscalCode, nomePagatore, codicePagatore', async () => {
    const resp = JSON.parse(
      '{"id":112751314,"idPayment":"6010fd99-209b-477f-8953-eecb0e20bb7e","amount":{"currency":"EUR","amount":100,"decimalDigits":2},"subject":"/RFB/01800000000102173/1.00/TXT/Donazione Emergenza Covid-19","receiver":"Azienda Sanitaria Regionale Molise","urlRedirectEc":"https://secure.pmpay.it/PagoPA/PaymentGateway?idSession=6010fd68-209b-477f-8953-eecb0e20bb7e&idDominio=01546900703","isCancelled":false,"bolloDigitale":false,"fiscalCode":"","origin":"IO_PAY","detailsList":[{"IUV":"01800000000102173","CCP":"75f8d1208a4511ec953c05d593d412e0","idDominio":"00000000001","enteBeneficiario":"Azienda Sanitaria Regionale del Molise","importo":1.00,"tipoPagatore":"F","codicePagatore":"","nomePagatore":""}],"iban":"IT71G0300203280954597746934"}',
    );
    const paymentSession = PaymentSession.decode(resp);

    expect(paymentSession.isRight()).toEqual(true);
  });

  it('Should successfully decode response with response without fiscalCode, nomePagatore, codicePagatore', async () => {
    const resp = JSON.parse(
      '{"id":112751314,"idPayment":"6010fd99-209b-477f-8953-eecb0e20bb7e","amount":{"currency":"EUR","amount":100,"decimalDigits":2},"subject":"/RFB/01800000000102173/1.00/TXT/Donazione Emergenza Covid-19","receiver":"Azienda Sanitaria Regionale Molise","urlRedirectEc":"https://secure.pmpay.it/PagoPA/PaymentGateway?idSession=6010fd68-209b-477f-8953-eecb0e20bb7e&idDominio=01546900703","isCancelled":false,"bolloDigitale":false,"origin":"IO_PAY","detailsList":[{"IUV":"01800000000102173","CCP":"75f8d1208a4511ec953c05d593d412e0","idDominio":"00000000001","enteBeneficiario":"Azienda Sanitaria Regionale del Molise","importo":1.00,"tipoPagatore":"F"}],"iban":"IT71G0300203280954597746934"}',
    );
    const paymentSession = PaymentSession.decode(resp);

    expect(paymentSession.isRight()).toEqual(true);
  });
});
