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
    res.status(422);
  } else {
    res.status(500);
  }
});

const routers: ReadonlyArray<Router> = [walletRouter];
routers.forEach(r => pm.use(r));

export default pm;
