import { Server } from 'http';

import { Browser, launch } from 'puppeteer';
import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import express from 'express';
import { fromNullable } from 'fp-ts/lib/Option';
import { getIdPayment } from '../../utils/testUtils';

describe('Email screen', () => {
  const SRV_PORT = process.env.IOPAY_DEV_SERVER_PORT ? parseInt(process.env.IOPAY_DEV_SERVER_PORT, 10) : 1234;
  const SRV_HOST = process.env.IOPAY_DEV_SERVER_HOST as string;
  const PM_DOCK_PORT = process.env.PAYMENT_MANAGER_DOCKER_PORT
    ? parseInt(process.env.PAYMENT_MANAGER_DOCKER_PORT, 10)
    : 1234;
  const PM_DOCK_HOST = process.env.PAYMENT_MANAGER_DOCKER_HOST as string;
  const PM_DOCK_CTRL_PORT = process.env.PAYMENT_MANAGER_DOCKER_CONTROL_PORT
    ? parseInt(process.env.PAYMENT_MANAGER_DOCKER_CONTROL_PORT, 10)
    : 8081;

  // eslint-disable-next-line functional/no-let
  let myDevServer: Server;
  // eslint-disable-next-line functional/no-let
  let devServerTerminator: HttpTerminator;
  // eslint-disable-next-line functional/no-let
  let myBrowser: Browser;

  beforeAll(() => {
    // Start server
    const myServer = express().use('/', express.static('dist'));
    myServer.get('/health-check', function (_, res) {
      res.sendStatus(200);
    });
    myDevServer = myServer.listen(SRV_PORT, SRV_HOST);
    devServerTerminator = createHttpTerminator({ server: myDevServer });
  });

  afterAll(async () => {
    await devServerTerminator.terminate();
  });

  beforeEach(async () => {
    myBrowser = await launch({ headless: true });
    // Health check
    const page = await myBrowser.newPage();
    const serverResponse = await page.goto(`http://${SRV_HOST}:${SRV_PORT}/health-check`);
    expect(serverResponse?.status()).toEqual(200);
    await page.close();
  });

  afterEach(async () => {
    await myBrowser.close();
  });

  it('should call start check payment on loading', async () => {
    // PRECONDITIONS
    const pmTab = await myBrowser.newPage();
    const [pmResponseApiDocs] = await Promise.all([
      pmTab.waitForResponse(response => response.request().method() === 'GET'),
      await pmTab.goto(`http://${PM_DOCK_HOST}:${PM_DOCK_PORT}/pp-restapi/v2/api-docs`),
    ]);

    expect(pmResponseApiDocs?.status()).toEqual(200);
    await pmTab.close();

    const page = await myBrowser.newPage();
    const myIdPayment = await getIdPayment(PM_DOCK_HOST, PM_DOCK_CTRL_PORT.toString());

    await Promise.all([
      page.goto(`http://${SRV_HOST}:${SRV_PORT}/index.html?p=${myIdPayment}`),
      page.waitForResponse(response => response.request().method() === 'GET' && /check/.test(response.request().url())),
    ]);

    const checkRes = await page.evaluate(() => sessionStorage.getItem('checkData'));
    expect(
      fromNullable(checkRes)
        .map(myString => JSON.parse(myString))
        .getOrElse({}),
    ).toMatchObject({ idPayment: myIdPayment });

    await page.close();
  });
});
