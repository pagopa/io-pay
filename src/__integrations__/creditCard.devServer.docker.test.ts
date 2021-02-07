import { Server } from 'http';

import { Browser, launch, Page } from 'puppeteer';
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
  // eslint-disable-next-line functional/no-let
  let page: Page;

  const creditCardFieldS = '#creditcardnumber';

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
    page = await myBrowser.newPage();

    await page.goto(`http://${HOST}:${PORT}/index.html?p=8fa64d75-acb4-4a74-a87c-32f348a6a95f`);
    await page.setViewport({ width: 1200, height: 907 });

    const emailS = '.emailform > #emailform #useremail';
    const buttonS = '#emailform > .windowcont__bottom > .container > .windowcont__bottom__wrap > .btn-primary';

    await page.waitForSelector(emailS);
    await page.focus(emailS);
    await page.keyboard.type('xxx@yyy.io');

    await page.click(buttonS);
  });
  /*
  afterEach(async () => {
    await page.close();
    await myBrowser.close();
  });
*/
  it('should show a warning text when the credit card number is wrong', async () => {
    // Start the browser environment

    await page.waitForSelector(creditCardFieldS);
    await page.focus(creditCardFieldS);
    await page.keyboard.type('2324234342423');

    const errorMsgS = '.creditform > #creditcardform > .form-group > .is-invalid > .custom-label--error';
    const errorMsgV = await page.$eval(errorMsgS, element => element.textContent);

    expect(errorMsgV).toMatch(/Inserisci un numero valido/);
  });

  it('should handle Mastercard cards, when the PAN is valid', async () => {
    await page.waitForSelector(creditCardFieldS);

    await page.focus(creditCardFieldS);
    await page.keyboard.type('5555555555554444');
    const checked = await page.$eval(creditCardFieldS, element => element.getAttribute('data-checked'));
    expect(checked).toMatch(/1/);
  });

  it('should handle Visa cards, when the PAN is valid', async () => {
    await page.waitForSelector(creditCardFieldS);

    await page.focus(creditCardFieldS);
    await page.keyboard.type('4111111111111111');
    const checked = await page.$eval(creditCardFieldS, element => element.getAttribute('data-checked'));
    expect(checked).toMatch(/1/);
  });

  it('should handle Maestro cards, when the PAN is valid', async () => {
    await page.waitForSelector(creditCardFieldS);

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
  });

  it('should handle American Express cards, when the PAN is valid', async () => {
    await page.waitForSelector(creditCardFieldS);

    await page.focus(creditCardFieldS);
    await page.keyboard.type('340024388482878');
    await expect(page.$eval(creditCardFieldS, element => element.getAttribute('data-checked'))).resolves.toMatch(/1/);
  });

  it('should remove data-checked attribute, when the card number is removed', async () => {
    await page.waitForSelector(creditCardFieldS);

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
  });
});
