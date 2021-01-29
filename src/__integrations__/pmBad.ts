// import { debug as cdebug } from 'console';

import { Application, Router } from 'express';
import express from 'express';
import cors from 'cors';

// create express server
const pmBad: Application = express();
pmBad.use(cors());

// Use router to keep the express app extensible
const walletRouter = Router();
walletRouter.post('/pp-restapi/v3/users/actions/start-session', function (_, res) {
  res.sendStatus(429);
});

const routers: ReadonlyArray<Router> = [walletRouter];
routers.forEach(r => pmBad.use(r));

export default pmBad;
