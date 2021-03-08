import { debug } from 'console';
import { Millisecond } from 'italia-ts-commons/lib/units';
import 'abort-controller/polyfill';
import nodeFetch from 'node-fetch';
import { fromNullable } from 'fp-ts/lib/Option';
import { DeferredPromise } from 'italia-ts-commons/lib/promises';
import { identity } from 'fp-ts/lib/function';
import { fromLeft, TaskEither, taskEither, tryCatch } from 'fp-ts/lib/TaskEither';
import { createClient, Client } from '../../../generated/definitions/pagopa/client';
import { constantPollingWithPromisePredicateFetch, retryingFetch } from '../../utils/fetch';
import { getIdPayment } from '../../utils/testUtils';
import { TypeEnum } from '../../../generated/definitions/pagopa/Wallet';
import { TransactionStatusResponse } from '../../../generated/definitions/pagopa/TransactionStatusResponse';
import { UNKNOWN } from '../../utils/TransactionStatesTypes';
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
  // eslint-disable-next-line functional/no-let
  let paymentManagerClientWithPolling_stepW: Client;
  // eslint-disable-next-line functional/no-let
  let paymentManagerClientWithPolling_stepR: Client;
  // PRECONDITION: Before pay endpoint, execute the following flow
  // 1. get a valid idPayment
  // 2. check the payment
  // 3. start the session
  // 4. approve terms and conditions
  // 5. add wallet
  // 6. pay
  // 7. trasaction check

  // eslint-disable-next-line functional/no-let
  let myIdPayment: string;
  // eslint-disable-next-line functional/no-let
  let startSessionResponse;
  // eslint-disable-next-line functional/no-let
  let walletResponse;
  // eslint-disable-next-line functional/no-let
  let myTransactionToken: string; // base64 string of idTransaction
  // eslint-disable-next-line functional/no-let
  let checkTransactionResponse: TransactionStatusResponse;

  const retries: number = 10;
  const delay: number = 3000;
  const timeout: Millisecond = 20000 as Millisecond;

  // This condition is used to retry polling check until it return 15
  // that means : "In attesa del metodo 3ds2"
  const is_WAIT_3DS2_ACS_METHOD = async (response: Response): Promise<boolean> => {
    const transactionStatus = TransactionStatusResponse.encode(await response.clone().json());
    return transactionStatus.data?.idStatus !== 15;
  };

  // This condition is used to retry polling check until it return 17
  // that means : "Ritornando dal metodo 3ds2"
  const is_RESUME_3DS2_ACS_METHOD = async (response: Response): Promise<boolean> => {
    const transactionStatus = TransactionStatusResponse.encode(await response.clone().json());
    return transactionStatus.data?.idStatus !== 17;
  };

  const checkStatusTask = (
    transactionId: string,
    paymentManagerClient: Client,
  ): TaskEither<UNKNOWN, TransactionStatusResponse> =>
    tryCatch(
      () =>
        paymentManagerClient.checkStatusUsingGET({
          id: transactionId,
        }),
      () => UNKNOWN.value,
    ).foldTaskEither(
      err => fromLeft(err),
      errorOrResponse =>
        errorOrResponse.fold(
          () => fromLeft(UNKNOWN.value),
          responseType => (responseType.status !== 200 ? fromLeft(UNKNOWN.value) : taskEither.of(responseType.value)),
        ),
    );

  beforeAll(async () => {
    // Start client
    pmClient = createClient({
      baseUrl: `http://${PM_DOCK_HOST}:${PM_DOCK_PORT}`,
      fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
    });

    paymentManagerClientWithPolling_stepW = createClient({
      baseUrl: `http://${PM_DOCK_HOST}:${PM_DOCK_PORT}`,
      fetchApi: constantPollingWithPromisePredicateFetch(
        DeferredPromise<boolean>().e1,
        retries,
        delay,
        timeout,
        is_WAIT_3DS2_ACS_METHOD,
      ),
    });

    paymentManagerClientWithPolling_stepR = createClient({
      baseUrl: `http://${PM_DOCK_HOST}:${PM_DOCK_PORT}`,
      fetchApi: constantPollingWithPromisePredicateFetch(
        DeferredPromise<boolean>().e1,
        retries,
        delay,
        timeout,
        is_RESUME_3DS2_ACS_METHOD,
      ),
    });
  });

  beforeEach(async () => {
    // Execute the Happy Path before testing payment
    myIdPayment = await getIdPayment(PM_DOCK_HOST, PM_DOCK_CTRL_PORT.toString());

    // check
    (
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
            fiscalCode: 'UQNSFM56P12T733D',
            idPayment: myIdPayment,
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
              brand: 'VISA',
              expireMonth: '03',
              expireYear: '25',
              holder: 'UserName UserSurname',
              pan: '4556311820389402',
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

    // Pay
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

    myTransactionToken = fromNullable(payResponse?.token).getOrElse('-1');

    // transaction check 1
    await checkStatusTask(myTransactionToken, paymentManagerClientWithPolling_stepW)
      .fold(_ => debug('To handle error'), identity)
      .run();
  });

  it('should return OK 200 response on first resume transaction after pay and switch on "Ritornando dal metodo 3ds2" status ', async () => {
    // resume
    const transactionResumeResponse = (
      await pmClient.resume3ds2UsingPOST({
        Bearer: `Bearer ${startSessionResponse?.sessionToken}`,
        id: myTransactionToken,
        resumeRequest: {
          data: { methodCompleted: 'Y' },
        },
        language: 'it',
      })
    ).fold(
      () => fail(),
      res => res.status,
    );
    expect(transactionResumeResponse).toEqual(200);

    // transaction check 2
    await checkStatusTask(myTransactionToken, paymentManagerClientWithPolling_stepR)
      .fold(
        _ => debug('To handle error'),
        r => (checkTransactionResponse = r),
      )
      .run();

    expect(17).toEqual(checkTransactionResponse?.data?.idStatus);
  });
});
