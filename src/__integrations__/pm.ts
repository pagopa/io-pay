import { Application, Router } from 'express';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import * as myFake from 'faker/locale/it';
import { fromNullable } from 'fp-ts/lib/Option';
import {
  approveTermsResponseAccepted,
  httpResponseStatus,
  sessionTokenInternalException,
  sessionTokenUnprocessableEntity,
} from '../__mocks__/mocks';

// create express server
const pm: Application = express();
pm.use(cors());
pm.use(bodyParser.json());
// Use router to keep the express app extensible
const walletRouter = Router();
walletRouter.post('/pp-restapi/v3/users/actions/start-session', function (req, res) {
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
walletRouter.post('/pp-restapi/v3/users/actions/approve-terms', function (req, res) {
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
walletRouter.get('/pp-restapi/v3/payments/:id/actions/check', function (req, res) {
  if (req.params.id === '8fa64d75-acb4-4a74-a87c-32f348a6a95f') {
    res.json({
      data: {
        id: 2,
        idPayment: '8fa64d75-acb4-4a74-a87c-32f348a6a95f',
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

const routers: ReadonlyArray<Router> = [walletRouter];
routers.forEach(r => pm.use(r));

export default pm;
