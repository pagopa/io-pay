import { fromLeft, taskEither, TaskEither, tryCatch } from 'fp-ts/lib/TaskEither';
import { GENERIC_STATUS } from '../utils/TransactionStatesTypes';
import * as PmClient from '../../generated/definitions/pagopa/client';
import * as IoPayPortalClient from '../../generated/definitions/iopayportal/client';

import * as t from 'io-ts';
import { getConfigOrThrow } from '../utils/config';
import { retryingFetch } from '../utils/fetch';
import { Millisecond } from 'italia-ts-commons/lib/units';
import { NonEmptyString } from 'italia-ts-commons/lib/strings';
import { BrowserInfoResponse } from '../../generated/definitions/iopayportal/BrowserInfoResponse';

const ResponseTaskR = t.interface({
  isFinalStatus: t.string,
  status: GENERIC_STATUS,
});

const ResponseTaskO = t.partial({ methodUrl: t.string, acsUrl: t.string, htmlXpay: t.string });

export const ResponseTask = t.intersection([ResponseTaskR, ResponseTaskO], 'ResponseTask');

export type ResponseTask = t.TypeOf<typeof ResponseTask>;

const pmClient: PmClient.Client = PmClient.createClient({
  baseUrl: getConfigOrThrow().IO_PAY_PAYMENT_MANAGER_HOST,
  fetchApi: retryingFetch(fetch, 2000 as Millisecond, 3),
});

const iopayportalClient: IoPayPortalClient.Client = IoPayPortalClient.createClient({
  baseUrl: getConfigOrThrow().IO_PAY_FUNCTIONS_HOST,
  fetchApi: retryingFetch(fetch, 2000 as Millisecond, 3),
});

const getBrowserInfoTask = (iopayportalClient: IoPayPortalClient.Client): TaskEither<Error, BrowserInfoResponse> =>
  tryCatch(
    () => iopayportalClient.GetBrowsersInfo({}),
    () => 'BrowserInfo Network Error',
  ).foldTaskEither(
    err => fromLeft(new Error(err)),
    errorOrResponse =>
      errorOrResponse.fold(
        () => fromLeft(new Error('BrowserInfo Error')),
        responseType =>
          responseType.status !== 200
            ? fromLeft(new Error(`BrowserInfo Error : ${responseType.status}`))
            : taskEither.of(responseType.value),
      ),
  );

/**
 * This function return a EMV compliant color depth
 * or take the maximum valid colorDepth below the given colorDepth.
 * @param colorDepth  (number)
 * @returns EMV compliant colorDepth (number)
 */
const getEMVCompliantColorDepth = (colorDepth: number): number => {
  const validColorsDepths: Array<number> = [1, 4, 8, 15, 16, 24, 32, 48];
  const maxValidColorDepthsLength: number = 48;

  const maybeValidColor = validColorsDepths.includes(colorDepth)
    ? colorDepth
    : validColorsDepths.find(
        (validColorDepth, index) => validColorDepth < colorDepth && colorDepth < validColorsDepths[index + 1],
      );

  return maybeValidColor === undefined ? maxValidColorDepthsLength : maybeValidColor;
};

export const payTask = (
  idPayment: NonEmptyString,
  idWallet: number,
  sessionToken: NonEmptyString,
  browserJavaEnabled: NonEmptyString,
  browserLanguage: NonEmptyString,
  browserColorDepth: NonEmptyString,
  browserScreenHeight: NonEmptyString,
  browserScreenWidth: NonEmptyString,
  browserTZ: NonEmptyString,
  browserUserAgent,
  deliveryEmailAddress: NonEmptyString,
  mobilePhone: NonEmptyString,
  tipo: NonEmptyString,
  cvv: NonEmptyString,
): TaskEither<Error, ResponseTask> | any => {
  
  getBrowserInfoTask(iopayportalClient).chain( browserInfo => 
    
    tryCatch(
      () =>
        pmClient.pay3ds2UsingPOST({
          Bearer: `Bearer ${sessionToken}`,
          id: idPayment,
          payRequest: {
            data: {
              tipo,
              idWallet: idWallet,
              cvv,
              threeDSData: JSON.stringify({
                browserJavaEnabled,
                browserLanguage,
                browserColorDepth,
                browserScreenHeight,
                browserScreenWidth,
                browserTZ,
                browserAcceptHeader: browserInfo.accept,
                browserIP: browserInfo.ip,
                browserUserAgent,
                acctID: idWallet,
                deliveryEmailAddress,
                mobilePhone,
              }),
            },
          },
          language: 'it',
        }),
      e => {
        return toError;
      },
    )
    )

  const threeDSData = {
    browserJavaEnabled,
    browserLanguage,
    browserColorDepth,
    browserScreenHeight,
    browserScreenWidth,
    browserTZ,
    browserAcceptHeader: browserInfo.accept,
    browserIP: browserInfo.ip,
    browserUserAgent,
    acctID: idWallet,
    deliveryEmailAddress,
    mobilePhone,
  };

  tryCatch(
    () =>
      pmClient.pay3ds2UsingPOST({
        Bearer: `Bearer ${sessionToken}`,
        id: idPayment,
        payRequest: {
          data: {
            tipo,
            idWallet: idWallet,
            cvv,
            threeDSData: JSON.stringify(threeDSData),
          },
        },
        language: 'it',
      }),
    e => {
      errorHandler(ErrorsType.CONNECTION);
      mixpanel.track(PAYMENT_PAY3DS2_NET_ERR.value, { EVENT_ID: PAYMENT_PAY3DS2_NET_ERR.value, e });
      return toError;
    },
  );
  return '{)';
};
