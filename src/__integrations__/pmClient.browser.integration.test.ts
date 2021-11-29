import { Server } from 'http';

import { Browser, launch } from 'puppeteer';
import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import express from 'express';
import pm from './pm';

/**
 * This test suite tests the autogenerated client for PM in a browser
 * environment. The browser fetches index.html from the DevServer, which serves
 * from localhost:1235. When the DOM is loaded, a script inside index.html is
 * executed. The script creates a new instance of PM Client, configured with a
 * retryable fetch, to interact with the Bad PM on localhost:9666.
 * The Bad PM replies 429 to start-session POST, so the PM Client should retry
 * start-session many times. That way also the retryable fetch gets tested
 */
describe('PM Client', () => {
  const SRV_PORT = process.env.IOPAY_DEV_SERVER_PORT ? parseInt(process.env.IOPAY_DEV_SERVER_PORT, 10) : 1234;
  const SRV_HOST = process.env.IOPAY_DEV_SERVER_HOST as string;

  const PM_PORT = process.env.PAYMENT_MANAGER_STUB_PORT ? parseInt(process.env.PAYMENT_MANAGER_STUB_PORT, 10) : 5000;
  const PM_HOST = process.env.PAYMENT_MANAGER_STUB_HOST as string;

  // eslint-disable-next-line functional/no-let
  let myDevServer: Server;
  // eslint-disable-next-line functional/no-let
  let pmServer: Server;
  // eslint-disable-next-line functional/no-let
  let devServerTerminator: HttpTerminator;
  // eslint-disable-next-line functional/no-let
  let pmTerminator: HttpTerminator;

  // eslint-disable-next-line functional/no-let
  let myBrowser: Browser;

  beforeAll(() => {
    // Start server
    const myServer = express().use('/', express.static('distTest'));
    myDevServer = myServer.listen(SRV_PORT, SRV_HOST);
    devServerTerminator = createHttpTerminator({ server: myDevServer });

    pmServer = pm.listen(PM_PORT, PM_HOST);
    pmTerminator = createHttpTerminator({ server: pmServer });
  });

  afterAll(async () => {
    await Promise.all([pmTerminator.terminate(), devServerTerminator.terminate()]);
  });

  beforeEach(async () => {
    myBrowser = await launch({ headless: true });
  });

  afterEach(async () => {
    await myBrowser.close();
  });

//   it('should retry 3 times on start-session', async () => {
//     const pmTab = await myBrowser.newPage();

//     // eslint-disable-next-line functional/no-let
//     let requestCounter = 0;

//     // Intercept requests to count calls to start-session
//     await pmTab.setRequestInterception(true);
//     pmTab.on('request', async request => {
//       if (request.method() === 'OPTIONS') {
//         requestCounter++;
//       }
//       await request.continue();
//     });

//     const serverResponse = await pmTab.goto(`http://${SRV_HOST}:${SRV_PORT}/index.html`);

//     await new Promise(resolve => setTimeout(resolve, 4000));

//     expect(serverResponse?.status()).toEqual(200);
//     expect(requestCounter).toEqual(3);

//     await pmTab.close();
//   });
// });
