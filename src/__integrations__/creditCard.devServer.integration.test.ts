import { Server } from 'http';

import { Browser, launch } from 'puppeteer';
import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import express from 'express';

describe('Credit Card Field', () => {
  const PORT = process.env.IOPAY_DEV_SERVER_PORT ? parseInt(process.env.IOPAY_DEV_SERVER_PORT, 10) : 1234;
  const HOST = process.env.IOPAY_DEV_SERVER_HOST as string;

  // eslint-disable-next-line functional/no-let
  let myDevServer: Server;
  // eslint-disable-next-line functional/no-let
  let devServerTerminator: HttpTerminator;
  // eslint-disable-next-line functional/no-let
  let myBrowser: Browser;

  beforeAll(() => {
    // Start server
    const myServer = express().use('/', express.static('dist'));
    myDevServer = myServer.listen(PORT, HOST);
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

  it('should show a warning text when the credit card number is wrong', async () => {
    // Start the browser environment
    const page = await myBrowser.newPage();

    await page.goto(`http://${HOST}:${PORT}/index.html?p=1234`);
    await page.setViewport({ width: 1200, height: 907 });

    const creditCardFieldS = '#creditcardnumber';
    await page.waitForSelector(creditCardFieldS);
    await page.focus(creditCardFieldS);
    await page.keyboard.type('2324234342423');

    const errorMsgS = '.creditform > #creditcardform > .form-group > .is-invalid > .custom-label--error';
    const errorMsgV = await page.$eval(errorMsgS, element => element.textContent);

    expect(errorMsgV).toMatch(/Inserisci un numero valido/);
    await page.close();
  });

  it('should handle Mastercard cards, when the PAN is valid', async () => {
    const page = await myBrowser.newPage();

    await page.goto(`http://${HOST}:${PORT}/index.html?p=1234`);
    await page.setViewport({ width: 1200, height: 907 });

    const creditCardFieldS = '#creditcardnumber';

    await page.focus(creditCardFieldS);
    await page.keyboard.type('5555555555554444');
    const checked = await page.$eval(creditCardFieldS, element => element.getAttribute('data-checked'));
    expect(checked).toMatch(/1/);
  });

  it('should handle Visa cards, when the PAN is valid', async () => {
    const page = await myBrowser.newPage();

    await page.goto(`http://${HOST}:${PORT}/index.html?p=1234`);
    await page.setViewport({ width: 1200, height: 907 });

    const creditCardFieldS = '#creditcardnumber';

    await page.focus(creditCardFieldS);
    await page.keyboard.type('4111111111111111');
    const checked = await page.$eval(creditCardFieldS, element => element.getAttribute('data-checked'));
    expect(checked).toMatch(/1/);
    await page.close();
  });

  it('should handle Maestro cards, when the PAN is valid', async () => {
    // Start the browser environment
    const page = await myBrowser.newPage();

    await page.goto(`http://${HOST}:${PORT}/index.html?p=1234`);
    await page.setViewport({ width: 1200, height: 907 });

    const creditCardFieldS = '#creditcardnumber';
    const creditCardInput = await page.$(creditCardFieldS);

    await page.focus(creditCardFieldS);
    await page.keyboard.type('6759649826438453');
    await expect(page.$eval(creditCardFieldS, element => element.getAttribute('data-checked'))).resolves.toMatch(/1/);

    // Delete inserted PAN
    await creditCardInput?.click({ clickCount: 3 });
    await creditCardInput?.press('Backspace');

    // Different length
    await page.keyboard.type('6799990100000000019');
    await expect(page.$eval(creditCardFieldS, element => element.getAttribute('data-checked'))).resolves.toMatch(/1/);
    await page.close();
  });

  it('should handle American Express cards, when the PAN is valid', async () => {
    const page = await myBrowser.newPage();

    await page.goto(`http://${HOST}:${PORT}/index.html?p=1234`);
    await page.setViewport({ width: 1200, height: 907 });

    const creditCardFieldS = '#creditcardnumber';

    await page.focus(creditCardFieldS);
    await page.keyboard.type('340024388482878');
    await expect(page.$eval(creditCardFieldS, element => element.getAttribute('data-checked'))).resolves.toMatch(/1/);
    await page.close();
  });

  it('should remove data-checked attribute, when the card number is removed', async () => {
    const page = await myBrowser.newPage();

    await page.goto(`http://${HOST}:${PORT}/index.html?p=1234`);
    await page.setViewport({ width: 1200, height: 907 });

    const creditCardFieldS = '#creditcardnumber';
    const creditCardInput = await page.$(creditCardFieldS);

    await page.focus(creditCardFieldS);
    await page.keyboard.type('5555555555554444');
    const checked = await page.$eval(creditCardFieldS, element => element.getAttribute('data-checked'));
    expect(checked).toMatch(/1/);

    // Delete inserted PAN
    await creditCardInput?.click({ clickCount: 3 });
    await creditCardInput?.press('Backspace');

    const myAttr = await page.$eval(creditCardFieldS, element => element.getAttribute('data-checked'));
    expect(myAttr).toBeNull();
    await page.close();
  });
});
