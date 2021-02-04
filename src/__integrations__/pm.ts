// import { debug as cdebug } from 'console';

import { Application, Router } from 'express';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import * as myFake from 'faker/locale/it';
import { fromNullable } from 'fp-ts/lib/Option';
import { WalletRequest } from '../../generated/definitions/pagopa/WalletRequest';

// create express server
const pm: Application = express();
pm.use(cors());
pm.use(bodyParser.json());

// Use router to keep the express app extensible
const walletRouter = Router();
walletRouter.post('/pp-restapi/v3/users/actions/start-session', function (req, res) {
  if (req.body.data.email === 'tooManyRequests@pm.com') {
    res.sendStatus(429);
  } else {
    res.json({
      data: {
        sessionToken: myFake.random.alphaNumeric(128),
        user: {
          email: 'pippo@pluto.com',
          status: 'ANONYMOUS',
        },
      },
    });
  }
});

walletRouter.post('/pp-restapi/v3/wallet', function (req, res) {
  WalletRequest.decode(req.body).fold(
    () => res.sendStatus(500),
    decodedReq => {
      if (!req.headers.authorization?.match(/Bearer [\d\w]{128}/)) {
        return res.sendStatus(401);
      } else if (
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
            idWallet: 40,
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
              logoPSP: 'http://pagopa-dev:8080/pp-restapi/v3/resources/psp/8',
              serviceLogo: 'http://pagopa-dev:8080/pp-restapi/v3/resources/service/8',
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
  );
});

const routers: ReadonlyArray<Router> = [walletRouter];
routers.forEach(r => pm.use(r));

export default pm;
