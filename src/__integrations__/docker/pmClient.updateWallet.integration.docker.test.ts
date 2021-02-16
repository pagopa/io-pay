import { debug } from 'console';

// import { fromNullable } from 'fp-ts/lib/Option';
import { Millisecond } from 'italia-ts-commons/lib/units';
import 'abort-controller/polyfill';
import nodeFetch from 'node-fetch';
import { createClient, Client } from '../../../generated/definitions/pagopa/client';
import { retryingFetch } from '../../utils/fetch';
import { getIdPayment } from '../../utils/testUtils';
import { TypeEnum } from '../../../generated/definitions/pagopa/Wallet';
// eslint-disable-next-line @typescript-eslint/no-explicit-any,functional/immutable-data
(global as any).fetch = nodeFetch;

describe('Endpoint PUT wallet of PM', () => {
  // Set the testing environment

  const PM_DOCK_PORT = process.env.PAYMENT_MANAGER_DOCKER_PORT
    ? parseInt(process.env.PAYMENT_MANAGER_DOCKER_PORT, 10)
    : 1234;
  const PM_DOCK_HOST = process.env.PAYMENT_MANAGER_DOCKER_HOST as string;
  const PM_DOCK_CTRL_PORT = process.env.PAYMENT_MANAGER_DOCKER_CONTROL_PORT
    ? parseInt(process.env.PAYMENT_MANAGER_DOCKER_CONTROL_PORT, 10)
    : 8081;
  // eslint-disable-next-line functional/no-let
  let pmClient: Client;

  // PRECONDITION: Before pay endpoint, execute the following flow
  // 1. get a valid idPayment
  // 2. check the payment
  // 3. start the session
  // 4. approve terms and conditions
  // 5. add wallet

  // eslint-disable-next-line functional/no-let
  let myIdPayment;
  // eslint-disable-next-line functional/no-let
  let checkResponse;
  // eslint-disable-next-line functional/no-let
  let startSessionResponse;
  // eslint-disable-next-line functional/no-let
  let walletResponse;

  beforeAll(async () => {
    // Start client
    pmClient = createClient({
      baseUrl: `http://${PM_DOCK_HOST}:${PM_DOCK_PORT}`,
      fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
    });
  });

  beforeEach(async () => {
    // Execute the Happy Path before testing payment
    myIdPayment = await getIdPayment(PM_DOCK_HOST, PM_DOCK_CTRL_PORT.toString());

    debug('ID PAYMENT', myIdPayment);
    // check
    checkResponse = (
      await pmClient.checkPaymentUsingGET({
        id: myIdPayment,
      })
    ).fold(
      _ => fail(),
      res => res.value?.data,
    );

    debug(checkResponse);

    // start session
    startSessionResponse = (
      await pmClient.startSessionUsingPOST({
        startSessionRequest: {
          data: {
            email: 'username@domain.com',
            fiscalCode: 'UQNSFM56P12T733D',
            idPayment: myIdPayment,
          },
        },
      })
    ).fold(
      _ => fail(),
      res => res.value?.data,
    );

    debug('START SESSION', startSessionResponse);
    /*
    // approve terms
    (
      await pmClient.approveTermsUsingPOST({
        Bearer: `Bearer ${startSessionResponse?.sessionToken}`,
        approveTermsRequest: {
          data: {
            terms: true,
            privacy: true,
          },
        },
      })
    ).fold(
      () => fail(),
      res => res.value?.data,
    );
*/
    // POST Wallet
    walletResponse = (
      await pmClient.addWalletUsingPOST({
        Bearer: `Bearer ${startSessionResponse?.sessionToken}`,
        walletRequest: {
          data: {
            type: TypeEnum.CREDIT_CARD,
            creditCard: {
              brand: 'VISA',
              expireMonth: '03',
              expireYear: '25',
              holder: 'UserName UserSurname',
              pan: '4024007182788397',
              securityCode: '666',
            },
            favourite: true,
            idPagamentoFromEC: myIdPayment,
          },
        },
        language: 'it',
      })
    ).fold(
      () => fail(),
      res => res.value?.data,
    );

    debug('WALLET RESPONSE', walletResponse);
  });

  it('should return modified wallet when the default psp gets updated', async () => {
    // Psps list
    const psps = (
      await pmClient.getPspListUsingGET({
        Bearer: `Bearer ${startSessionResponse?.sessionToken}`,
        paymentType: 'CREDIT_CARD',
        idPayment: myIdPayment,
      })
    ).fold(
      () => fail(),
      res => res.value?.data,
    );

    debug(psps);

    const updateWalletResponse = (
      await pmClient.updateWalletUsingPUT({
        Bearer: `Bearer ${startSessionResponse?.sessionToken}`,
        id: walletResponse.idWallet,
        walletRequest: {
          data: {},
        },
      })
    ).fold(
      () => fail(),
      res => res.value?.data,
    );

    debug('UPDATE WALLET', updateWalletResponse);
  });
  /*
  it('should return 404 when the idPayment is void', async () => {
    // Pay
    const payResponseStatus = (
      await pmClient.payUsingPOST({
        Bearer: `Bearer ${startSessionResponse?.sessionToken}`,
        id: '',
        payRequest: {
          data: { idWallet: walletResponse?.idWallet, cvv: '666' },
        },
        language: 'it',
      })
    ).fold(
      () => fail(),
      res => res.status,
    );

    expect(payResponseStatus).toEqual(404);
  });

  it('should return 422 when the idWallet is wrong', async () => {
    // Pay
    const payResponseStatus = (
      await pmClient.payUsingPOST({
        Bearer: `Bearer ${startSessionResponse?.sessionToken}`,
        id: myIdPayment,
        payRequest: {
          data: { idWallet: -1, cvv: '666' },
        },
        language: 'it',
      })
    ).fold(
      err => (err.pop()?.value as Response).status,
      () => undefined,
    );

    expect(payResponseStatus).toEqual(422);
  });

  it('should return 422 when the idPayment is wrong', async () => {
    // Pay
    const payResponseStatus = (
      await pmClient.payUsingPOST({
        Bearer: `Bearer ${startSessionResponse?.sessionToken}`,
        id: 'wrong_idPayment',
        payRequest: {
          data: { idWallet: walletResponse?.idWallet, cvv: '666' },
        },
        language: 'it',
      })
    ).fold(
      err => (err.pop()?.value as Response).status,
      () => undefined,
    );

    expect(payResponseStatus).toEqual(422);
  });

  it('should return 500 when the payRequest is empty', async () => {
    // Pay
    const payResponseStatus = (
      await pmClient.payUsingPOST({
        Bearer: `Bearer ${startSessionResponse?.sessionToken}`,
        id: myIdPayment,
        payRequest: {},
        language: 'it',
      })
    ).fold(
      err => (err.pop()?.value as Response).status,
      () => undefined,
    );

    expect(payResponseStatus).toEqual(500);
  }); */
});
