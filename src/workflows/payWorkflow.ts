import { fromLeft, taskEither, TaskEither, tryCatch } from 'fp-ts/lib/TaskEither';
import { Millisecond } from 'italia-ts-commons/lib/units';
import * as PmClient from '../../generated/definitions/pagopa/client';
import * as IoPayPortalClient from '../../generated/definitions/iopayportal/client';

import { getConfigOrThrow } from '../utils/config';
import { retryingFetch } from '../utils/fetch';
import { BrowserInfoResponse } from '../../generated/definitions/iopayportal/BrowserInfoResponse';
import { TransactionResponse } from '../../generated/definitions/pagopa/TransactionResponse';
import { ErrorsType } from '../js/errorhandler';
import { PAYMENT_PAY3DS2_RESP_ERR, PAYMENT_PAY3DS2_SVR_ERR } from '../utils/mixpanelHelperInit';
import { ErrorTask } from './types/ErrorTask';

/**
 * This function define a task that:
 *
 * 1. retrieve ip, accept header and user agent invoking io-functions-pay-portal;
 * 2. builds the 3dsData;
 * 3. invokes pay3ds2 API of the Payment Manager.
 *
 * The result is a TaskEither<ErrorTask, TransactionResponse>;
 */
export const payWorkflow = (
  idPayment: string,
  idWallet: number,
  sessionToken: string,
  browserJavaEnabled: string,
  browserLanguage: string,
  browserColorDepth: string,
  browserScreenHeight: string,
  browserScreenWidth: string,
  browserTZ: string,
  browserUserAgent: string,
  deliveryEmailAddress: string,
  mobilePhone: string,
  tipo: string,
  cvv: string,
  language: string,
): TaskEither<ErrorTask, TransactionResponse> => {
  const pmClient: PmClient.Client = PmClient.createClient({
    baseUrl: getConfigOrThrow().IO_PAY_PAYMENT_MANAGER_HOST,
    fetchApi: retryingFetch(fetch, 2000 as Millisecond, 3),
  });

  const iopayportalClient: IoPayPortalClient.Client = IoPayPortalClient.createClient({
    baseUrl: getConfigOrThrow().IO_PAY_FUNCTIONS_HOST,
    fetchApi: retryingFetch(fetch, 2000 as Millisecond, 3),
  });

  return getBrowserInfoTask(iopayportalClient).chain(browserInfo =>
    pay3dsTask(
      idPayment,
      idWallet,
      sessionToken,
      browserJavaEnabled,
      browserLanguage,
      browserColorDepth,
      browserScreenHeight,
      browserScreenWidth,
      browserTZ,
      browserUserAgent,
      deliveryEmailAddress,
      mobilePhone,
      tipo,
      cvv,
      browserInfo.accept,
      browserInfo.ip,
      language,
      pmClient,
    ),
  );
};

const getBrowserInfoTask = (iopayportalClient: IoPayPortalClient.Client): TaskEither<ErrorTask, BrowserInfoResponse> =>
  tryCatch(
    () => iopayportalClient.GetBrowsersInfo({}),
    () => ErrorsType.CONNECTION,
  ).foldTaskEither(
    () => fromLeft({ type: ErrorsType.GENERIC_ERROR, event: PAYMENT_PAY3DS2_SVR_ERR.value.toString() }),
    errOrResponse =>
      errOrResponse.fold(
        () => fromLeft({ type: ErrorsType.GENERIC_ERROR, event: PAYMENT_PAY3DS2_RESP_ERR.value.toString() }),
        response =>
          response.status !== 200
            ? fromLeft({ type: ErrorsType.GENERIC_ERROR, event: PAYMENT_PAY3DS2_RESP_ERR.value.toString() })
            : taskEither.of(response.value),
      ),
  );

const pay3dsTask = (
  idPayment: string,
  idWallet: number,
  sessionToken: string,
  browserJavaEnabled: string,
  browserLanguage: string,
  browserColorDepth: string,
  browserScreenHeight: string,
  browserScreenWidth: string,
  browserTZ: string,
  browserUserAgent: string,
  deliveryEmailAddress: string,
  mobilePhone: string,
  tipo: string,
  cvv: string,
  browserAcceptHeader: string,
  browserIP: string,
  language: string,
  pmClient: PmClient.Client,
): TaskEither<ErrorTask, TransactionResponse> =>
  tryCatch(
    () =>
      pmClient.pay3ds2UsingPOST({
        Bearer: `Bearer ${sessionToken}`,
        id: idPayment,
        payRequest: {
          data: {
            tipo,
            idWallet,
            cvv,
            threeDSData: JSON.stringify({
              browserJavaEnabled,
              browserLanguage,
              browserColorDepth,
              browserScreenHeight,
              browserScreenWidth,
              browserTZ,
              browserAcceptHeader,
              browserIP,
              browserUserAgent,
              acctID: idWallet.toString(),
              deliveryEmailAddress,
              mobilePhone,
            }),
          },
        },
        language,
      }),
    () => ErrorsType.CONNECTION,
  ).foldTaskEither(
    () => fromLeft({ type: ErrorsType.GENERIC_ERROR, event: PAYMENT_PAY3DS2_RESP_ERR.value.toString() }),
    errorOrResponse =>
      errorOrResponse.fold(
        () => fromLeft({ type: ErrorsType.GENERIC_ERROR, event: PAYMENT_PAY3DS2_RESP_ERR.value.toString() }),
        responseType =>
          responseType.status !== 200
            ? fromLeft({ type: ErrorsType.GENERIC_ERROR, event: PAYMENT_PAY3DS2_RESP_ERR.value.toString() })
            : taskEither.of(responseType.value),
      ),
  );
