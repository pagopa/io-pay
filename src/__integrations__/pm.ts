import { Application, Router } from 'express';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import * as myFake from 'faker/locale/it';
import { StartSessionRequest } from '../../generated/definitions/pagopa/StartSessionRequest';

// create express server
const pm: Application = express();
pm.use(cors());
pm.use(bodyParser.json());
// Use router to keep the express app extensible
const walletRouter = Router();
walletRouter.post('/pp-restapi/v3/users/actions/start-session', function (req, res) {
  StartSessionRequest.decode(req.body).fold(
    () => res.sendStatus(500),
    decodedReq => {
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
    },
  );
});

const routers: ReadonlyArray<Router> = [walletRouter];
routers.forEach(r => pm.use(r));

export default pm;
