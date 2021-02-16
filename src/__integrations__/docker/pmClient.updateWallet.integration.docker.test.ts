// import { fromNullable } from 'fp-ts/lib/Option';
import { Millisecond } from 'italia-ts-commons/lib/units';
import 'abort-controller/polyfill';
import nodeFetch from 'node-fetch';
import { fromNullable } from 'fp-ts/lib/Option';
import { identity } from 'fp-ts/lib/function';
import { createClient, Client } from '../../../generated/definitions/pagopa/client';
import { retryingFetch } from '../../utils/fetch';
import { getIdPayment } from '../../utils/testUtils';
import { TypeEnum } from '../../../generated/definitions/pagopa/Wallet';
import { WalletResponse } from '../../../generated/definitions/pagopa/WalletResponse';
import { PspListResponse } from '../../../generated/definitions/pagopa/PspListResponse';
// import { PspListResponse } from '../../../generated/definitions/pagopa/PspListResponse';
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
  let myIdPayment: string;
  // eslint-disable-next-line functional/no-let
  let startSessionResponse;
  // eslint-disable-next-line functional/no-let
  let walletResponse: WalletResponse;

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
      res => res.value?.data,
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
              brand: 'AMEX',
              expireMonth: '03',
              expireYear: '25',
              holder: 'UserName UserSurname',
              pan: '374379020906869',
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
      res => WalletResponse.decode(res.value).getOrElse({ data: {} }),
    );
  });

  it('should return modified wallet when the default psp is updated', async () => {
    // GET Psps list

    const psps = (
      await pmClient.getPspListUsingGET({
        Bearer: `Bearer ${startSessionResponse?.sessionToken}`,
        paymentType: walletResponse.data.type as string,
        isList: true,
        idWallet: walletResponse.data.idWallet,
        language: 'it',
        idPayment: myIdPayment,
      })
    ).fold(
      () => fail(),
      res => PspListResponse.decode(res.value).fold(() => fail(), identity),
    );

    const pspsList = fromNullable(psps.data?.pspList).getOrElse([]);

    const updateWalletResponse =
      pspsList.length > 1 // PSP can be changed
        ? (
            await pmClient.updateWalletUsingPUT({
              Bearer: `Bearer ${startSessionResponse?.sessionToken}`,
              id: fromNullable(walletResponse.data.idWallet).getOrElse(-1),
              walletRequest: {
                data: {
                  // Select the new PSP as the first returned by GET psps with an ID different from the default one
                  idPsp: pspsList[pspsList.findIndex(psp => psp.id !== walletResponse.data.idPsp)].id, // Just set the ID of the new PSP
                },
              },
            })
          ).fold(
            () => fail(),
            res => WalletResponse.decode(res.value).fold(() => fail(), identity),
          )
        : { data: {} };

    expect(walletResponse.data.idPsp).not.toEqual(updateWalletResponse.data.idPsp);
    expect(walletResponse.data.psp).not.toEqual(updateWalletResponse.data.psp);
  });

  it('should return 401 when the Bearer Token is wrong', async () => {
    const updateWalletResponse = (
      await pmClient.updateWalletUsingPUT({
        Bearer: 'Bearer wrong_token',
        id: fromNullable(walletResponse.data.idWallet).getOrElse(-1),
        walletRequest: {
          data: {
            idPsp: walletResponse.data.idPsp,
          },
        },
      })
    ).fold(
      () => undefined,
      res => res.status,
    );

    expect(updateWalletResponse).toEqual(401);
  });

  it('should return 422 when the idWallet is wrong', async () => {
    const updateWalletResponse = (
      await pmClient.updateWalletUsingPUT({
        Bearer: `Bearer ${startSessionResponse?.sessionToken}`,
        id: -1,
        walletRequest: {
          data: {
            idPsp: walletResponse.data.idPsp,
          },
        },
      })
    ).fold(
      err => (err.pop()?.value as Response).status,
      () => undefined,
    );

    expect(updateWalletResponse).toEqual(422);
  });

  it('should return 422 when the idPsp is wrong', async () => {
    const updateWalletResponse = (
      await pmClient.updateWalletUsingPUT({
        Bearer: `Bearer ${startSessionResponse?.sessionToken}`,
        id: fromNullable(walletResponse.data.idWallet).getOrElse(-1),
        walletRequest: {
          data: {
            idPsp: -1,
          },
        },
      })
    ).fold(
      err => (err.pop()?.value as Response).status,
      () => undefined,
    );

    expect(updateWalletResponse).toEqual(422);
  });

  it('should return current wallet when data is empty', async () => {
    const updateWalletResponse = (
      await pmClient.updateWalletUsingPUT({
        Bearer: `Bearer ${startSessionResponse?.sessionToken}`,
        id: fromNullable(walletResponse.data.idWallet).getOrElse(-1),
        walletRequest: {
          data: {},
        },
      })
    ).fold(
      () => fail(),
      res => WalletResponse.decode(res.value).fold(() => fail(), identity),
    );

    expect(updateWalletResponse).toEqual(walletResponse);
  });
});
