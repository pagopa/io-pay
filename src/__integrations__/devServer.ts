import express from 'express';

const app = express();

app.use('/', express.static('dist'));
app.get('/health-check', function (_, res) {
  res.sendStatus(200);
});
export default app;
