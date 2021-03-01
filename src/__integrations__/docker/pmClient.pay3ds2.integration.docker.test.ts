import { fromNullable } from 'fp-ts/lib/Option';
import { Millisecond } from 'italia-ts-commons/lib/units';
import 'abort-controller/polyfill';
import nodeFetch from 'node-fetch';
import { DeferredPromise } from 'italia-ts-commons/lib/promises';
import { tryCatch } from 'fp-ts/lib/TaskEither';
import { createClient, Client } from '../../../generated/definitions/pagopa/client';
import { constantPollingWithPromisePredicateFetch, retryingFetch } from '../../utils/fetch';
import { getIdPayment } from '../../utils/testUtils';
import { TypeEnum } from '../../../generated/definitions/pagopa/Wallet';
import { TransactionStatusResponse } from '../../../generated/definitions/pagopa/TransactionStatusResponse';

// eslint-disable-next-line @typescript-eslint/no-explicit-any,functional/immutable-data
(global as any).fetch = nodeFetch;

describe('Endpoint pay3ds2 of PM', () => {
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

    // check
    checkResponse = (
      await pmClient.checkPaymentUsingGET({
        id: myIdPayment,
      })
    ).fold(
      _ => fail(),
      res => res.value?.data,
    );

    // start session
    startSessionResponse = (
      await pmClient.startSessionUsingPOST({
        startSessionRequest: {
          data: {
            email: 'username@domain.com',
            fiscalCode: 'UQNSFM56P12T733D', // seems to be ignored by PM
            idPayment: myIdPayment, // seems to be ignored by PM
          },
        },
      })
    ).fold(
      _ => fail(),
      res => res.value,
    );

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

    // POST Wallet
    walletResponse = (
      await pmClient.addWalletUsingPOST({
        Bearer: `Bearer ${startSessionResponse?.sessionToken}`,
        walletRequest: {
          data: {
            type: TypeEnum.CREDIT_CARD,
            creditCard: {
              brand: 'yyy',
              expireMonth: '03',
              expireYear: '25',
              holder: 'UserName UserSurname',
              pan: '5133765016844455',
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
  });

  it('should return idWallet, idPayment and amount matching the ones in previous calls ', async () => {
    // Pay
    // Please note that the Pay request doesn't contain IP address and Browser Accepted Headers
    const payResponse = (
      await pmClient.pay3ds2UsingPOST({
        Bearer: `Bearer ${startSessionResponse?.sessionToken}`,
        id: myIdPayment,
        payRequest: {
          data: {
            idWallet: walletResponse?.idWallet,
            cvv: '666',
            threeDSData: JSON.stringify({
              acctId: `ACCT_${walletResponse.idWallet?.toString().trim()}`,
              browserColorDepth: 30,
              browserJavaEnabled: false,
              browserLanguage: 'it-IT',
              browserScreenHeight: 1120,
              browserScreenWidth: 1792,
              browserTZ: -60,
              browserUserAgent:
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36',
              deliveryEmailAddress: 'username@domain.us',
              workPhone: '3336666666',
            }),
          },
        },
        language: 'it',
      })
    ).fold(
      () => fail(),
      res => res.value?.data,
    );

    expect(payResponse?.idWallet).toEqual(walletResponse?.idWallet);
    expect(payResponse?.nodoIdPayment).toEqual(myIdPayment);
    expect(fromNullable(payResponse?.amount?.amount).getOrElse(0)).toEqual(
      fromNullable(checkResponse?.amount?.amount).getOrElse(0),
    );
    expect(
      (fromNullable(payResponse?.amount?.amount).getOrElse(0) as number) +
        (fromNullable(payResponse?.fee?.amount).getOrElse(0) as number),
    ).toEqual(fromNullable(payResponse?.grandTotal?.amount).getOrElse(0));
  });

  it('should execute STEP0 of 3ds2 flow', async () => {
    // Pay
    // Please note that the Pay request doesn't contain IP address and Browser Accepted Headers
    const payResponse = (
      await pmClient.pay3ds2UsingPOST({
        Bearer: `Bearer ${startSessionResponse?.sessionToken}`,
        id: myIdPayment,
        payRequest: {
          data: {
            idWallet: walletResponse?.idWallet,
            cvv: '666',
            threeDSData: JSON.stringify({
              acctId: `ACCT_${walletResponse.idWallet?.toString().trim()}`,
              browserColorDepth: 30,
              browserJavaEnabled: false,
              browserLanguage: 'it-IT',
              browserScreenHeight: 1120,
              browserScreenWidth: 1792,
              browserTZ: -60,
              browserUserAgent:
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36',
              deliveryEmailAddress: 'username@domain.us',
              workPhone: '3336666666',
            }),
          },
        },
        language: 'it',
      })
    ).fold(
      () => fail(),
      res => res.value?.data,
    );

    // CheckStatusUsingGET is designed to be executed in polling, so a polling client is needed
    const paymentManagerClientWithPolling: Client = createClient({
      baseUrl: `http://${PM_DOCK_HOST}:${PM_DOCK_PORT}`,
      fetchApi: constantPollingWithPromisePredicateFetch(
        DeferredPromise<boolean>().e1,
        5,
        300,
        10000 as Millisecond,
        async (r: Response): Promise<boolean> => {
          const myJson = (await r.clone().json()) as TransactionStatusResponse;
          // Stop the polling when this condition is false
          return myJson.data.idStatus !== 15;
        },
      ),
    });

    await tryCatch(
      () =>
        paymentManagerClientWithPolling.checkStatusUsingGET({
          id: fromNullable(payResponse?.token).getOrElse(''),
        }),
      () => undefined,
    )
      .fold(
        () => undefined,
        _ => {
          const myCheck = _.fold(
            () => undefined,
            _ => (_.status === 200 ? _.value : undefined),
          );
          expect(myCheck?.data.idTransaction).toEqual(payResponse?.id);
          expect(myCheck?.data.idPayment).toEqual(myIdPayment);
          expect(myCheck?.data.idStatus).toEqual(15);
        },
      )
      .run();
  });

  it('should return 404 when the idPayment is void', async () => {
    // Pay
    const payResponseStatus = (
      await pmClient.pay3ds2UsingPOST({
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
      await pmClient.pay3ds2UsingPOST({
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
      await pmClient.pay3ds2UsingPOST({
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
      await pmClient.pay3ds2UsingPOST({
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
  });
});
