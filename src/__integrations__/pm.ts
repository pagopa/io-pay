import { Application, Router } from 'express';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import * as myFake from 'faker/locale/it';
import { fromNullable } from 'fp-ts/lib/Option';
import { fromPredicate } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { PayRequest } from '../../generated/definitions/pagopa/PayRequest';
import { WalletRequest } from '../../generated/definitions/pagopa/WalletRequest';

import {
  approveTermsResponseAccepted,
  getTermAndServices,
  httpResponseStatus,
  qrParams,
  sessionTokenInternalException,
  sessionTokenUnprocessableEntity,
} from '../__mocks__/mocks';
// import { identity } from 'fp-ts/lib/function';

// create express server
const pm: Application = express();
pm.use(cors());
pm.use(bodyParser.json());

// Use router to keep the express app extensible
const walletRouter = Router();

const goodIdPayment = '8fa64d75-acb4-4a74-a87c-32f348a6a95f';
const goodIdWallet = 100;

walletRouter.post('/pp-restapi/v4/users/actions/start-session', function (req, res) {
  const decodedReq = req.body;
  if (decodedReq.data?.email === 'tooManyRequests@pm.com') {
    return res.sendStatus(429);
  } else if (decodedReq.data && Object.keys(decodedReq.data).length === 0) {
    return res.sendStatus(422);
  } else if (!Object.prototype.hasOwnProperty.call(decodedReq.data, 'email')) {
    return res.sendStatus(500);
  } else {
    return res.json({
      data: {
        sessionToken: myFake.random.alphaNumeric(128),
        user: {
          email: decodedReq.data?.email,
          status: 'ANONYMOUS',
        },
      },
    });
  }
});

// approve-terms
walletRouter.post('/pp-restapi/v4/users/actions/approve-terms', function (req, res) {
  fromNullable(req.header('Authorization')) // iif not null Authorization header
    .map(authHd => {
      if (req.headers.authorization?.match(/Bearer [\d\w]{128}/)) {
        res.json({
          data: {
            email: approveTermsResponseAccepted.email,
            status: approveTermsResponseAccepted.status,
            acceptTerms: req.body.data?.terms && req.body.data?.privacy,
            notificationEmail: approveTermsResponseAccepted.notificationEmail,
            fiscalCode: approveTermsResponseAccepted.fiscalCode,
            emailVerified: approveTermsResponseAccepted.emailVerified,
            cellphoneVerified: approveTermsResponseAccepted.cellphoneVerified,
          },
        });
      } else {
        switch (authHd) {
          case sessionTokenUnprocessableEntity:
            // to emulate RestApiUnprocessableEntityException PM's behavior
            res.sendStatus(httpResponseStatus.HTTP_422);
            break;
          case sessionTokenInternalException:
            // to emulate RestAPIInternalException PM's behavior
            res.sendStatus(httpResponseStatus.HTTP_500);
            break;
          default:
            // Otherwise Authorization header wrong or expired - Unauthorized
            res.sendStatus(httpResponseStatus.HTTP_401);
        }
      }
    })
    .getOrElseL(() => {
      // Authorization header not sets - Unauthorized
      res.sendStatus(httpResponseStatus.HTTP_401);
    });
});
walletRouter.get('/pp-restapi/v4/payments/:id/actions/check', function (req, res) {
  if (req.params.id === goodIdPayment) {
    res.json({
      data: {
        id: 2,
        idPayment: goodIdPayment,
        amount: {
          currency: 'EUR',
          amount: 6248175,
          decimalDigits: 2,
        },
        subject: 'Pagamento',
        receiver: 'PagoPa',
        urlRedirectEc: 'http://localhost:8081/pa/ec?paymentId=8fa64d75-acb4-4a74-a87c-32f348a6a95f',
        isCancelled: false,
        bolloDigitale: false,
        fiscalCode: 'EBTSXF80K80O236Y',
        origin: 'WALLET_APP',
        idCarrello: 'HLKhX74Hs10alLP',
        detailsList: [
          {
            IUV: 'iuv_sALhaTPOXEuOtev',
            CCP: 'ccp_zWsYypbFbtCmGdk',
            idDominio: 'idD_dlukWMxHQADVNZT',
            enteBeneficiario: 'Bluemeadow TAFE',
            importo: 62481.75,
            tipoPagatore: 'F',
            codicePagatore: 'EZWYAN18K87Z388V',
            nomePagatore: 'Sig. Romolo Bellini',
          },
        ],
        iban: 'IT09J1599878743S611F1PY9R92',
      },
    });
  } else if (req.params.id === 'ca41570b-8c03-496b-9192-9284dec646d2') {
    res.sendStatus(422);
  } else if (req.params.id === 'bn41570b-8c03-5432-9192-4444dec646d2') {
    res.sendStatus(404);
  } else {
    res.sendStatus(500);
  }
});

walletRouter.post('/pp-restapi/v4/wallet', function (req, res) {
  fromPredicate(
    (myReq: typeof req) => /Bearer [\d\w]{128}/.test(fromNullable(myReq.headers.authorization).getOrElse('')),
    identity,
  )(req).fold(
    () => res.sendStatus(401),
    myReq =>
      WalletRequest.decode(myReq.body).fold(
        () => res.sendStatus(500),

        decodedReq => {
          if (
            // request id {}
            Object.keys(decodedReq).length === 0
          ) {
            return res.sendStatus(500);
          } else if (decodedReq.data && Object.keys(decodedReq.data).length === 0) {
            return res.sendStatus(422);
          } else if (decodedReq.data?.creditCard?.expireYear?.match(/(\d\d.+)|[^\d]+/)) {
            return res.sendStatus(422);
          } else if (!Object.prototype.hasOwnProperty.call(decodedReq.data, 'idPagamentoFromEC')) {
            return res.sendStatus(500);
          } else {
            const obscuredPan = fromNullable(decodedReq.data?.creditCard?.pan as string)
              .map(myPan => '*'.repeat(myPan?.length - 4) + myPan?.substr(myPan.length - 4))
              .getOrElse('************4444');
            return res.json({
              data: {
                idWallet: goodIdWallet,
                type: 'CREDIT_CARD',
                favourite: false,
                creditCard: {
                  id: 48,
                  holder: decodedReq.data?.creditCard?.holder,
                  pan: obscuredPan,
                  expireMonth: decodedReq.data?.creditCard?.expireMonth,
                  expireYear: decodedReq.data?.creditCard?.expireYear,
                  brandLogo: 'http://localhost:8080/wallet/assets/img/creditcard/generic.png',
                  flag3dsVerified: false,
                  brand: 'OTHER',
                  hpan: myFake.random.alphaNumeric(64),
                  onUs: false,
                },
                psp: {
                  id: 8,
                  idPsp: 'POSTE1',
                  businessName: 'Poste Italiane',
                  paymentType: 'CP',
                  idIntermediary: 'BANCOPOSTA',
                  idChannel: 'POSTE1',
                  logoPSP: 'http://pagopa-dev:8080/pp-restapi/v4/resources/psp/8',
                  serviceLogo: 'http://pagopa-dev:8080/pp-restapi/v4/resources/service/8',
                  serviceName: 'nomeServizio 02 poste (MOD0)',
                  fixedCost: [Object],
                  appChannel: false,
                  serviceAvailability: 'disponibilitaServizio FRANCESE',
                  urlInfoChannel: 'http://www.test.sia.eu',
                  paymentModel: 0,
                  idCard: 11008,
                  lingua: 'IT',
                  codiceAbi: '06220',
                  isPspOnus: false,
                  solvedByPan: false,
                },
                idPsp: 8,
                pspEditable: false,
                onboardingChannel: 'WISP',
                services: ['FA', 'pagoPA', 'BPD'],
                isPspToIgnore: false,
                saved: false,
                registeredNexi: false,
              },
            });
          }
        },
      ),
  );
});
// resources
walletRouter.get('/pp-restapi/v4/resources', function (req, res) {
  const termsAndConditionsR: string = getTermAndServices(req.query[qrParams.language] as string);
  res.json({
    data: {
      is3ds2: 'false',
      SPID_CALLBACK_URL: 'https://auth.pagopa.agid.gov.it/vaservices/internal',
      urlImg: 'http://pagopa-dev:8080/pp-restapi/v4/resources/service/img/',
      creditCardPlaceholder: 'http://localhost:8080/cc/mastercard.png',
      termsAndConditions: termsAndConditionsR,
    },
  });
});

walletRouter.post('/pp-restapi/v4/payments/:id/actions/pay', function (req, res) {
  fromPredicate(
    (myReq: typeof req) => /Bearer [\d\w]{128}/.test(fromNullable(myReq.headers.authorization).getOrElse('')),
    identity,
  )(req).fold(
    () => res.sendStatus(401),
    myReq =>
      PayRequest.decode(myReq.body).fold(
        () => res.sendStatus(500),

        decodedReq => {
          if (
            // request id {}
            Object.keys(decodedReq).length === 0
          ) {
            return res.sendStatus(500);
          } else if (
            decodedReq.data &&
            (Object.keys(decodedReq.data).length === 0 ||
              fromNullable(decodedReq.data.idWallet).getOrElse(-1) <= 0 ||
              req.params.id !== goodIdPayment)
          ) {
            return res.sendStatus(422);
          } else if (Object.keys(fromNullable(decodedReq).getOrElse({})).length === 0) {
            return res.sendStatus(500);
          } else {
            return res.json({
              data: {
                id: 43,
                created: '2021-02-11T13:36:53.000Z',
                updated: '2021-02-11T13:36:53.000Z',
                amount: { currency: 'EUR', amount: 2981249, decimalDigits: 2 },
                grandTotal: { currency: 'EUR', amount: 2981250, decimalDigits: 2 },
                description: 'Pagamento',
                merchant: 'PagoPa',
                idStatus: 0,
                statusMessage: 'Da autorizzare',
                error: false,
                success: false,
                fee: { currency: 'EUR', amount: 1, decimalDigits: 2 },
                urlCheckout3ds: 'http://pagopa-dev:8080/wallet/checkout?id=NDM=',
                paymentModel: 0,
                token: 'NDM=',
                idWallet: goodIdWallet,
                idPsp: 8,
                idPayment: 115,
                nodoIdPayment: goodIdPayment,
                orderNumber: 43,
                paymentCancelled: false,
                detailsList: [
                  {
                    IUV: 'iuv_fiQILNxqvjcnupl',
                    CCP: 'ccp_mQrRJWmRkltrgaD',
                    idDominio: 'idD_UQoAUiWcOEyyclr',
                    enteBeneficiario: 'Clearcourt Technical College',
                    importo: 29812.49,
                    tipoPagatore: 'F',
                    codicePagatore: 'OPSHHY00H69M949Q',
                    nomePagatore: 'Mietta Pellegrini',
                  },
                ],
                directAcquirer: false,
              },
            });
          }
        },
      ),
  );
});

const routers: ReadonlyArray<Router> = [walletRouter];
routers.forEach(r => pm.use(r));

export default pm;
