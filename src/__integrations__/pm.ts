// import { debug as cdebug } from 'console';

import { Application, Router } from 'express';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import * as myFake from 'faker/locale/it';

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

const routers: ReadonlyArray<Router> = [walletRouter];
routers.forEach(r => pm.use(r));

export default pm;

/*  ADD WALLET POST

{
  data: {
    idWallet: 40,
    type: 'CREDIT_CARD',
    favourite: false,
    creditCard: {
      id: 48,
      holder: 'Ciccio Mio',
      pan: '************8397',
      expireMonth: '03',
      expireYear: '25',
      brandLogo: 'http://localhost:8080/wallet/assets/img/creditcard/generic.png',
      flag3dsVerified: false,
      brand: 'OTHER',
      hpan: 'eb05fa2d38fba34bc89bb7e92ada279f8424acde82338407e8589fdce0901545',
      onUs: false
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
      solvedByPan: false
    },
    idPsp: 8,
    pspEditable: false,
    onboardingChannel: 'WISP',
    services: [ 'FA', 'pagoPA', 'BPD' ],
    isPspToIgnore: false,
    saved: false,
    registeredNexi: false
  }
}
*/
