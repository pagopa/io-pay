import * as myFake from 'faker/locale/it';
import { Millisecond } from 'italia-ts-commons/lib/units';
import nodeFetch from 'node-fetch';
import { left, right } from 'fp-ts/lib/Either';

// eslint-disable-next-line functional/immutable-data, no-underscore-dangle
(global as any).window._env_ = {
  IO_PAY_PAYMENT_MANAGER_HOST: 'http://localhost:8080',
  IO_PAY_FUNCTIONS_HOST: 'http://localhost:7071',
  IO_PAY_ENV: 'develop',
  IO_PAY_API_TIMEOUT: '10000',
} as any;

// eslint-disable-next-line functional/immutable-data
(global as any).OnetrustActiveGroups = '';

import {
  checkStatusTask,
  nextTransactionStep,
  resumeTransactionTask,
  resumeXpayTransactionTask,
} from '../transactionHelper';
import { Client, createClient } from '../../../generated/definitions/pagopa/client';
import { retryingFetch } from '../fetch';
import { EsitoEnum } from '../../../generated/definitions/pagopa/Xpay3DSResponse';

// eslint-disable-next-line @typescript-eslint/no-explicit-any,functional/immutable-data
(global as any).fetch = nodeFetch;

afterEach(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
});

const pmClient: Client = createClient({
  baseUrl: 'http://localhost:8080',
  fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
});

const sessionToken = myFake.random.alphaNumeric(128);

const idTransaction = 'MjA=';

const transactionStatusResponse = {
  data: {
    idTransaction: 6,
    idStatus: 3,
    statusMessage: 'Confermato',
    finalStatus: true,
    expired: false,
    authorizationCode: '00',
    paymentOrigin: 'WALLET_APP',
    idPayment: '7652e590-324d-421a-8fa6-e0d8d0633906',
    result: 'OK',
  },
};

describe('TransactionHelper', () => {
  it('should return 200 if resume3ds2UsingPOST is successfull', async () => {
    jest.spyOn(pmClient, 'resume3ds2UsingPOST').mockReturnValueOnce(
      Promise.resolve(
        right({
          headers: {},
          status: 200,
          value: undefined,
        }),
      ),
    );

    const result = await resumeTransactionTask('Y', sessionToken, idTransaction, pmClient).run();

    expect(pmClient.resume3ds2UsingPOST).toHaveBeenCalledTimes(1);
    expect(result.isRight()).toEqual(true);
    expect(result.getOrElse(-1)).toEqual(200);
  });

  it('should return -1 if resume3ds2UsingPOST fails', async () => {
    jest.spyOn(pmClient, 'resume3ds2UsingPOST').mockReturnValueOnce(Promise.resolve(left([])));

    const result = await resumeTransactionTask('Y', sessionToken, idTransaction, pmClient).run();

    expect(pmClient.resume3ds2UsingPOST).toHaveBeenCalledTimes(1);
    expect(result.isLeft()).toEqual(true);
  });

  it('should return -1 if resume3ds2UsingPOST respond with 401 due to invalid token', async () => {
    jest.spyOn(pmClient, 'resume3ds2UsingPOST').mockReturnValueOnce(
      Promise.resolve(
        right({
          headers: {},
          status: 401,
          value: undefined,
        }),
      ),
    );

    const result = await resumeTransactionTask('Y', 'invalidToken', idTransaction, pmClient).run();

    expect(pmClient.resume3ds2UsingPOST).toHaveBeenCalledTimes(1);
    expect(result.isLeft()).toEqual(true);
  });

  it('should return transactionStatusResponse if checkStatusUsingGET is successfull', async () => {
    jest.spyOn(pmClient, 'checkStatusUsingGET').mockReturnValueOnce(
      Promise.resolve(
        right({
          headers: {},
          status: 200,
          value: transactionStatusResponse,
        }),
      ),
    );

    const result = await checkStatusTask(idTransaction, sessionToken, pmClient).run();

    expect(pmClient.checkStatusUsingGET).toHaveBeenCalledTimes(1);
    expect(result.isRight()).toEqual(true);
    expect(result.getOrElse({ data: { idStatus: -1 } })).toEqual(transactionStatusResponse);
  });

  it('should return -1 if checkStatusUsingGET fails', async () => {
    jest.spyOn(pmClient, 'checkStatusUsingGET').mockReturnValueOnce(Promise.resolve(left([])));

    const result = await checkStatusTask(idTransaction, sessionToken, pmClient).run();

    expect(pmClient.checkStatusUsingGET).toHaveBeenCalledTimes(1);
    expect(result.isLeft()).toEqual(true);
  });

  it('should return -1 if checkStatusUsingGET respond with 404 due to invalid idTransaction', async () => {
    jest.spyOn(pmClient, 'checkStatusUsingGET').mockReturnValueOnce(
      Promise.resolve(
        right({
          headers: {},
          status: 404,
          value: {},
        }),
      ),
    );

    const result = await checkStatusTask('invalidIdTransaction', sessionToken, pmClient).run();

    expect(pmClient.checkStatusUsingGET).toHaveBeenCalledTimes(1);
    expect(result.isLeft()).toEqual(true);
  });

  it('should return 200 if resumeUsingPOST is successfull', async () => {
    jest.spyOn(pmClient, 'resumeUsingPOST').mockReturnValueOnce(
      Promise.resolve(
        right({
          headers: {},
          status: 200,
          value: undefined,
        }),
      ),
    );

    const result = await resumeXpayTransactionTask(
      {
        esito: EsitoEnum.OK,
        idOperazione: 'idOperazione',
        mac: 'mac',
        resumeType: 'xpay',
        timestamp: '2345234534',
        xpayNonce: 'xpayNonce',
      },
      '',
      sessionToken,
      idTransaction,
      pmClient,
    ).run();

    expect(pmClient.resumeUsingPOST).toHaveBeenCalledTimes(1);
    expect(result.isRight()).toEqual(true);
    expect(result.getOrElse(-1)).toEqual(200);
  });

  it('should return -1 if resumeUsingPOST fails', async () => {
    jest.spyOn(pmClient, 'resumeUsingPOST').mockReturnValueOnce(Promise.resolve(left([])));

    const result = await resumeXpayTransactionTask(
      {
        esito: EsitoEnum.OK,
        idOperazione: 'idOperazione',
        mac: 'mac',
        resumeType: 'xpay',
        timestamp: '2345234534',
        xpayNonce: 'xpayNonce',
      },
      '',
      sessionToken,
      idTransaction,
      pmClient,
    ).run();

    expect(pmClient.resumeUsingPOST).toHaveBeenCalledTimes(1);
    expect(result.isLeft()).toEqual(true);
  });

  it('should return -1 if resumeUsingPOST respond with 401 due to invalid token', async () => {
    jest.spyOn(pmClient, 'resumeUsingPOST').mockReturnValueOnce(
      Promise.resolve(
        right({
          headers: {},
          status: 401,
          value: undefined,
        }),
      ),
    );

    const result = await resumeXpayTransactionTask(
      {
        esito: EsitoEnum.OK,
        idOperazione: 'idOperazione',
        mac: 'mac',
        resumeType: 'xpay',
        timestamp: '2345234534',
        xpayNonce: 'xpayNonce',
      },
      '',
      sessionToken,
      idTransaction,
      pmClient,
    ).run();

    expect(pmClient.resumeUsingPOST).toHaveBeenCalledTimes(1);
    expect(result.isLeft()).toEqual(true);
  });

  it('should return challenge if acsUrl is in transactionStatusResponse', () => {
    const transactionStatusResponse = {
      data: {
        idTransaction: 6,
        idStatus: 2,
        statusMessage: 'Confermato',
        finalStatus: false,
        expired: false,
        authorizationCode: '00',
        paymentOrigin: 'WALLET_APP',
        idPayment: '7652e590-324d-421a-8fa6-e0d8d0633906',
        result: 'OK',
        acsUrl: 'https://acsurl.com',
      },
    };

    const step = nextTransactionStep(transactionStatusResponse);

    expect(step).toEqual('challenge');
  });

  it('should return method if methodUrl is in transactionStatusResponse', () => {
    const transactionStatusResponse = {
      data: {
        idTransaction: 6,
        idStatus: 2,
        statusMessage: 'Confermato',
        finalStatus: false,
        expired: false,
        authorizationCode: '00',
        paymentOrigin: 'WALLET_APP',
        idPayment: '7652e590-324d-421a-8fa6-e0d8d0633906',
        result: 'OK',
        methodUrl: 'https://methodurl.com',
      },
    };

    const step = nextTransactionStep(transactionStatusResponse);

    expect(step).toEqual('method');
  });
  it('should return xpay if methodUrl is in transactionStatusResponse', () => {
    const transactionStatusResponse = {
      data: {
        idTransaction: 6,
        idStatus: 2,
        statusMessage: 'Confermato',
        finalStatus: false,
        expired: false,
        authorizationCode: '00',
        paymentOrigin: 'WALLET_APP',
        idPayment: '7652e590-324d-421a-8fa6-e0d8d0633906',
        result: 'OK',
        xpayHtml: '<a>redirect</a>',
      },
    };

    const step = nextTransactionStep(transactionStatusResponse);

    expect(step).toEqual('xpay');
  });
});
