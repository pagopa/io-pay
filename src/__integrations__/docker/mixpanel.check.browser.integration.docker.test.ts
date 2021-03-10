import { Server } from 'http';
import { Browser, launch } from 'puppeteer';
import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import express from 'express';
import { fromNullable } from 'fp-ts/lib/Option';
import { getIdPayment } from '../../utils/testUtils';
import {
  PAYMENT_CHECK_INIT,
  PAYMENT_CHECK_SUCCESS,
  PAYMENT_RESOURCES_INIT,
  PAYMENT_RESOURCES_SUCCESS,
  PAYMENT_START_SESSION_INIT,
  PAYMENT_START_SESSION_SUCCESS,
  PAYMENT_APPROVE_TERMS_INIT,
  PAYMENT_APPROVE_TERMS_SUCCESS,
  PAYMENT_WALLET_INIT,
  PAYMENT_WALLET_SUCCESS,
  PAYMENT_PAY3DS2_INIT,
  PAYMENT_PAY3DS2_SUCCESS,
  TRANSACTION_POLLING_M_CHECK_INIT,
  THREEDSMETHODURL_STEP1_REQ,
  THREEDSMETHODURL_STEP1_SUCCESS,
  TRANSACTION_RESUME3DS2_INIT,
  TRANSACTION_RESUME3DS2_SUCCESS,
  TRANSACTION_POLLING_M_CHECK_SUCCESS,
  THREEDSACSCHALLENGEURL_STEP2_REQ,
  THREEDSACSCHALLENGEURL_STEP2_SUCCESS,
} from '../../utils/mixpanelHelperInit';
import { TransactionStatusResponse } from '../../../generated/definitions/pagopa/TransactionStatusResponse';
import { TX_ACCEPTED } from '../../utils/TransactionStatesTypes';

// eslint-disable-next-line functional/no-let
let nEv: number = -1;
const nEventsFlow = [
  PAYMENT_CHECK_INIT,
  PAYMENT_CHECK_SUCCESS,
  PAYMENT_RESOURCES_INIT,
  PAYMENT_RESOURCES_SUCCESS,
  PAYMENT_START_SESSION_INIT,
  PAYMENT_START_SESSION_SUCCESS,
  PAYMENT_APPROVE_TERMS_INIT,
  PAYMENT_APPROVE_TERMS_SUCCESS,
  PAYMENT_WALLET_INIT,
  PAYMENT_WALLET_SUCCESS,
  PAYMENT_PAY3DS2_INIT,
  PAYMENT_PAY3DS2_SUCCESS,
  TRANSACTION_POLLING_M_CHECK_INIT,
  TRANSACTION_POLLING_M_CHECK_SUCCESS,
  THREEDSMETHODURL_STEP1_REQ,
  THREEDSMETHODURL_STEP1_SUCCESS,
  TRANSACTION_RESUME3DS2_INIT,
  TRANSACTION_RESUME3DS2_SUCCESS,
  TRANSACTION_POLLING_M_CHECK_INIT,
  TRANSACTION_POLLING_M_CHECK_SUCCESS,
  THREEDSACSCHALLENGEURL_STEP2_REQ,
  TRANSACTION_RESUME3DS2_INIT,
  TRANSACTION_RESUME3DS2_SUCCESS,
  TRANSACTION_POLLING_M_CHECK_INIT,
  TRANSACTION_POLLING_M_CHECK_SUCCESS,
  THREEDSACSCHALLENGEURL_STEP2_SUCCESS,
];

// set test timeout to support entire payment flow
jest.setTimeout(30000);

// eslint-disable-next-line sonarjs/cognitive-complexity
describe('mixpanel sequence events page check', () => {
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

  it('should call mixpanel init and success events for payment workflow', async () => {
    // get a good idPayment, using PM control interface
    const myIdPayment = await getIdPayment(PM_DOCK_HOST, PM_DOCK_CTRL_PORT.toString());
    const page = await myBrowser.newPage();

    page.on('response', async response => {
      if (response.url().includes('/actions/check')) {
        expect(response.status()).toEqual(200);
      }
    });

    page.on('console', message => {
      const eventId = `${message.text().substring(0, message.text().indexOf(' '))}`;
      if (message.type() === 'log') {
        expect(nEventsFlow[++nEv]?.value).toEqual(eventId);
      }
    });

    // check
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
    await page.keyboard.type('4024007190620228');

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

    const [pay3ds2Response] = await Promise.all([
      page.waitForResponse(
        response => response.request().method() === 'POST' && /pay3ds2/.test(response.request().url()),
      ),
      page.click(payButtonS),
      page.waitForNavigation(),
    ]);

    expect(pay3ds2Response.status()).toEqual(200);

    // polling method Step and Acs redirect
    // eslint-disable-next-line functional/no-let
    let waitForMethodUrl = true;

    while (waitForMethodUrl) {
      const [transactionCheck] = await Promise.all([
        page.waitForResponse(
          response => response.request().method() === 'GET' && /actions\/check/.test(response.request().url()),
        ),
      ]);
      const jsonResponse = (await transactionCheck.json()) as TransactionStatusResponse;

      waitForMethodUrl = jsonResponse.data.finalStatus === false && fromNullable(jsonResponse.data.methodUrl).isNone();
    }

    // Submit in ACS page and return on response page
    const acsSubmit = '#formChallenge > .btn.btn-primary';

    await page.waitForSelector(acsSubmit);
    await page.click(acsSubmit);

    // Polling to wait final transaction result
    // eslint-disable-next-line functional/no-let
    let waitForFinalStatus = true;
    // eslint-disable-next-line functional/no-let
    let jsonResponse;

    while (waitForFinalStatus) {
      const [transactionCheck] = await Promise.all([
        page.waitForResponse(
          response => response.request().method() === 'GET' && /actions\/check/.test(response.request().url()),
        ),
      ]);
      jsonResponse = (await transactionCheck.json()) as TransactionStatusResponse;

      waitForFinalStatus = jsonResponse.data.finalStatus === false;
    }

    // Check final succes result of transaction
    expect(jsonResponse.data.finalStatus).toEqual(true);
    expect(jsonResponse.data.idStatus).toEqual(TX_ACCEPTED.value);
    const finalResult =
      'body > div > div.container.flex-fill.main > div > div > div.windowcont__response > div > div.h3.text-center';
    await page.waitForSelector(finalResult);
    const element = await page.$(finalResult);
    const successDescription = await page.evaluate(el => el.textContent, element);
    expect(successDescription).toContain("Grazie, l'operazione è stata eseguita con successo!");

    await page.close();
  });
});
