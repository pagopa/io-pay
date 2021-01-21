import { readFileSync } from 'fs';
import path from 'path';
import express from 'express';

const app = express();
const entry = readFileSync(path.resolve(__dirname, '..', 'dist/index.html'), 'utf8');

app.get('/api/healthcheck', (_, res) => res.send('Healthy!'));

app.use('/', (_, res) => res.send(entry));

// dev-server.js
/*
const Bundler = require('parcel-bundler');

// const entry = path.resolve('src/index.html');
const bundle = new Bundler(entry);

app.use(bundle.middleware());

app.listen(process.env.NODE_ENV, err => {
  if (err) throw err;

  console.log(`Listening at http://localhost:${process.env.PORT}`);
});
*/

export default app;
