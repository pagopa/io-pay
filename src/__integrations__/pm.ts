// import { debug as cdebug } from 'console';

import { Application, Router } from 'express';
import express from 'express';
import * as myFake from 'faker/locale/it';

// create express server
const pm: Application = express();

// Use router to keep the express app extensible
const walletRouter = Router();
walletRouter.post('/pp-restapi/v3/users/actions/start-session', function (_, res) {
  res.json({
    data: {
      sessionToken: myFake.random.alphaNumeric(128),
      user: {
        email: 'pippo@pluto.com',
        status: 'ANONYMOUS',
      },
    },
  });
});

const routers: ReadonlyArray<Router> = [walletRouter];
routers.forEach(r => pm.use(r));

export default pm;
