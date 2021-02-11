import { Server } from 'http';

import { Browser, launch } from 'puppeteer';
import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import express from 'express';
import { fromNullable } from 'fp-ts/lib/Option';
import { getIdPayment } from '../../utils/testUtils';
import { TransactionResponse } from '../../../generated/definitions/pagopa/TransactionResponse';

describe('IOPAY App', () => {
  const SRV_PORT = process.env.IOPAY_DEV_SERVER_PORT ? parseInt(process.env.IOPAY_DEV_SERVER_PORT, 10) : 1234;
  const SRV_HOST = process.env.IOPAY_DEV_SERVER_HOST as string;

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

  it('should call start session, approve terms and add wallet when Continua is pressed on Credit Card input form', async () => {
    // get a good idPayment, using PM control interface
    const myIdPayment = await getIdPayment(PM_DOCK_HOST, PM_DOCK_CTRL_PORT.toString());

    // start the test
    const page = await myBrowser.newPage();
    await page.goto(`http://${SRV_HOST}:${SRV_PORT}/index.html?p=${myIdPayment}`);
    await page.setViewport({ width: 1200, height: 907 });

    // insert the email
    const emailFielS = '.emailform > #emailform #useremail';
    await page.waitForSelector(emailFielS);
    await page.click(emailFielS);
    await page.keyboard.type('username@domain.com');

    const emailButtonS = '#emailform > .windowcont__bottom > .container > .windowcont__bottom__wrap > .btn-primary';

    await page.waitForSelector(emailButtonS);
    await page.click(emailButtonS); // navigate to credit card form

    // Fill the form
    const creditCardHolderFieldS = '#creditcardname';
    await page.waitForSelector(creditCardHolderFieldS);
    await page.focus(creditCardHolderFieldS);
    await page.keyboard.type('Luigi XIV');

    const creditCardPANFieldS = '#creditcardnumber';
    await page.waitForSelector(creditCardPANFieldS);
    await page.focus(creditCardPANFieldS);
    await page.keyboard.type('4024007182788397');

    const creditCardExpDateFieldS = '#creditcardexpirationdate';
    await page.waitForSelector(creditCardExpDateFieldS);
    await page.focus(creditCardExpDateFieldS);
    await page.keyboard.type('01/25');

    const creditCardSecurCodeFieldS = '#creditcardsecurcode';
    await page.waitForSelector(creditCardSecurCodeFieldS);
    await page.focus(creditCardSecurCodeFieldS);
    await page.keyboard.type('666');

    const privacyToggleS = '#creditcardform #privacyToggler';
    await page.waitForSelector(privacyToggleS);
    await page.click(privacyToggleS);

    const buttonS = '#creditcardform > .windowcont__bottom > .container > .windowcont__bottom__wrap > .btn-primary';
    await page.waitForSelector(buttonS);

    const serverResponse = await Promise.all([
      page.waitForResponse(
        response => response.request().method() === 'OPTIONS' && /start-session/.test(response.request().url()),
      ),
      page.waitForResponse(
        response => response.request().method() === 'OPTIONS' && /approve-terms/.test(response.request().url()),
      ),
      page.waitForResponse(
        response => response.request().method() === 'OPTIONS' && /wallet/.test(response.request().url()),
      ),
      page.click(buttonS),
      page.waitForNavigation(),
    ]);

    // Assert CORS is working

    expect(serverResponse[0]?.headers()['access-control-allow-origin']).toEqual(`http://${SRV_HOST}:${SRV_PORT}`);
    expect(serverResponse[1]?.headers()['access-control-allow-origin']).toEqual(`http://${SRV_HOST}:${SRV_PORT}`);
    expect(serverResponse[2]?.headers()['access-control-allow-origin']).toEqual(`http://${SRV_HOST}:${SRV_PORT}`);

    const sessionStorageState = await Promise.all([
      page.evaluate(() => sessionStorage.getItem('wallet')),
      page.evaluate(() => sessionStorage.getItem('sessionToken')),
      page.evaluate(() => sessionStorage.getItem('approvalState')),
    ]);

    // Assert response payload, stored in Session Storage, is correct
    expect(
      fromNullable(sessionStorageState[0])
        .map(myString => JSON.parse(myString))
        .getOrElse({}),
    ).toMatchObject({ creditCard: { holder: 'Luigi XIV' } });

    expect(
      fromNullable(sessionStorageState[1])
        .map(myString => /[\d\w]{128}/.test(myString))
        .getOrElse(false),
    ).toBeTruthy();

    expect(
      fromNullable(sessionStorageState[2])
        .map(myString => JSON.parse(myString))
        .getOrElse({}),
    ).toMatchObject({ acceptTerms: true });

    await page.close();
  });

  it('should call start check payment, when app is loaded', async () => {
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

  it('should call pay when PAY is pressed on checkout Page', async () => {
    // get a good idPayment, using PM control interface
    const myIdPayment = await getIdPayment(PM_DOCK_HOST, PM_DOCK_CTRL_PORT.toString());

    // start the test
    const page = await myBrowser.newPage();
    await page.goto(`http://${SRV_HOST}:${SRV_PORT}/index.html?p=${myIdPayment}`);
    await page.setViewport({ width: 1200, height: 907 });

    // insert the email
    const emailFielS = '.emailform > #emailform #useremail';
    await page.waitForSelector(emailFielS);
    await page.click(emailFielS);
    await page.keyboard.type('username@domain.com');

    const emailButtonS = '#emailform > .windowcont__bottom > .container > .windowcont__bottom__wrap > .btn-primary';

    await page.waitForSelector(emailButtonS);
    await page.click(emailButtonS); // navigate to credit card form

    // Fill the credit card form
    const creditCardHolderFieldS = '#creditcardname';
    await page.waitForSelector(creditCardHolderFieldS);
    await page.focus(creditCardHolderFieldS);
    await page.keyboard.type('Luigi XIV');

    const creditCardPANFieldS = '#creditcardnumber';
    await page.waitForSelector(creditCardPANFieldS);
    await page.focus(creditCardPANFieldS);
    await page.keyboard.type('4024007182788397');

    const creditCardExpDateFieldS = '#creditcardexpirationdate';
    await page.waitForSelector(creditCardExpDateFieldS);
    await page.focus(creditCardExpDateFieldS);
    await page.keyboard.type('01/25');

    const creditCardSecurCodeFieldS = '#creditcardsecurcode';
    await page.waitForSelector(creditCardSecurCodeFieldS);
    await page.focus(creditCardSecurCodeFieldS);
    await page.keyboard.type('666');

    const privacyToggleS = '#creditcardform #privacyToggler';
    await page.waitForSelector(privacyToggleS);
    await page.click(privacyToggleS);

    const submitWalletbuttonS =
      '#creditcardform > .windowcont__bottom > .container > .windowcont__bottom__wrap > .btn-primary';
    await page.waitForSelector(submitWalletbuttonS);
    await page.click(submitWalletbuttonS);
    await page.waitForNavigation();

    const payButtonS = '#checkout > .windowcont__bottom > .container > .windowcont__bottom__wrap > .btn-primary';

    await page.waitForSelector(payButtonS);

    await Promise.all([
      page.waitForResponse(response => response.request().method() === 'POST' && /pay/.test(response.request().url())),
      page.click(payButtonS),
    ]);

    const payData = await page.evaluate(() => sessionStorage.getItem('payment'));

    expect(
      fromNullable(payData)
        .map(myString => JSON.parse(myString))
        .getOrElse({}).nodoIdPayment,
    ).toEqual(myIdPayment);

    expect(
      fromNullable(payData).map(myString => {
        const payment = { data: JSON.parse(myString) } as TransactionResponse;
        return (
          (payment.data?.amount?.amount as number) + (payment.data?.fee?.amount as number) ===
          (payment.data?.grandTotal?.amount as number)
        );
      }),
    ).toBeTruthy();

    await page.close();
  });
});
