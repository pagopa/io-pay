// import { debug as cdebug } from 'console';

import { Application, Router } from 'express';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import * as myFake from 'faker/locale/it';
import { fromNullable } from 'fp-ts/lib/Option';
import { approveTermsResponse, httpResponseStatus, sessionToken } from '../__mocks__/mocks';

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

// approve-terms
walletRouter.post('/pp-restapi/v3/users/actions/approve-terms', function (req, res) {
  fromNullable(req.header('Authorization')) // iif not null Authorization header
    .map(authHd => {
      if (authHd === sessionToken) {
        res.json({
          data: {
            email: approveTermsResponse.email,
            status: approveTermsResponse.status,
            acceptTerms: req.body.data?.terms && req.body.data?.privacy,
            notificationEmail: approveTermsResponse.notificationEmail,
            fiscalCode: approveTermsResponse.fiscalCode,
            emailVerified: approveTermsResponse.emailVerified,
            cellphoneVerified: approveTermsResponse.cellphoneVerified,
          },
        });
      } else {
        // Authorization header wrong or expired - Unauthorized
        res.sendStatus(httpResponseStatus.HTTP_422);
      }
    })
    .getOrElseL(() => {
      // Authorization header not sets - Unauthorized
      res.sendStatus(httpResponseStatus.HTTP_401);
    });
});

const routers: ReadonlyArray<Router> = [walletRouter];
routers.forEach(r => pm.use(r));

export default pm;
