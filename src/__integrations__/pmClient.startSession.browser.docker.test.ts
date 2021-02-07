import { Server } from 'http';

import { Browser, launch } from 'puppeteer';
import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import express from 'express';

describe('Home Page', () => {
  const SRV_PORT = process.env.IOPAY_DEV_SERVER_PORT ? parseInt(process.env.IOPAY_DEV_SERVER_PORT, 10) : 1234;
  const SRV_HOST = process.env.IOPAY_DEV_SERVER_HOST as string;
  const PM_DOCK_PORT = process.env.PAYMENT_MANAGER_DOCKER_PORT
    ? parseInt(process.env.PAYMENT_MANAGER_DOCKER_PORT, 10)
    : 1234;
  const PM_DOCK_HOST = process.env.PAYMENT_MANAGER_DOCKER_HOST as string;
  // eslint-disable-next-line functional/no-let
  let myDevServer: Server;
  // eslint-disable-next-line functional/no-let
  let devServerTerminator: HttpTerminator;

  // eslint-disable-next-line functional/no-let
  let myBrowser: Browser;

  beforeAll(() => {
    // Start server
    const myServer = express().use('/', express.static('dist'));
    myDevServer = myServer.listen(SRV_PORT, SRV_HOST);
    devServerTerminator = createHttpTerminator({ server: myDevServer });
  });

  afterAll(async () => {
    await devServerTerminator.terminate();
  });

  beforeEach(async () => {
    myBrowser = await launch({ headless: true });
  });

  afterEach(async () => {
    await myBrowser.close();
  });

  it('should call check payment when page is loaded', async () => {
    // PRECONDITIONS
    const pmTab = await myBrowser.newPage();
    const [pmResponseApiDocs] = await Promise.all([
      pmTab.waitForResponse(response => response.request().method() === 'GET'),
      await pmTab.goto(`http://${PM_DOCK_HOST}:${PM_DOCK_PORT}/pp-restapi/v2/api-docs`),
    ]);

    const idPayment = '8fa64d75-acb4-4a74-a87c-32f348a6a95f';

    expect(pmResponseApiDocs?.status()).toEqual(200);
    await pmTab.close();
    const page = await myBrowser.newPage();

    const [serverResponse] = await Promise.all([
      page.waitForResponse(
        response =>
          response.request().url() ===
          `http://${PM_DOCK_HOST}:${PM_DOCK_PORT}/pp-restapi/v3/payments/${idPayment}/actions/check`,
      ),
      page.goto(`http://${SRV_HOST}:${SRV_PORT}/index.html?p=${idPayment}`),
    ]);

    expect(serverResponse.status()).toEqual(422);

    await page.close();
  });
});
