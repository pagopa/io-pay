// import { debug as cdebug } from 'console';

import { Application } from 'express';
import express, { json } from 'express';
import cors from 'cors';

// create express server
const myServer: Application = express();
myServer.use(json());
myServer.use(cors());

myServer.get('/transient-error', function (_, res) {
  res.sendStatus(404);
});

myServer.get('/good-response', function (_, res) {
  res.json({
    msg: 'Hello World',
  });
});

export default myServer;
