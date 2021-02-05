import { Server } from 'http';

import { Browser, launch } from 'puppeteer';
import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import express from 'express';

describe('Data Submission Form', () => {
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

  it('should call start session, when Continua is pressed', async () => {
    // PRECONDITIONS
    const pmTab = await myBrowser.newPage();
    const [pmResponseApiDocs] = await Promise.all([
      pmTab.waitForResponse(response => response.request().method() === 'GET'),
      await pmTab.goto(`http://${PM_DOCK_HOST}:${PM_DOCK_PORT}/pp-restapi/v2/api-docs`),
    ]);

    expect(pmResponseApiDocs?.status()).toEqual(200);
    await pmTab.close();

    const page = await myBrowser.newPage();

    await page.goto(`http://${SRV_HOST}:${SRV_PORT}/index.html?p=6666`);
    await page.setViewport({ width: 1200, height: 907 });

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
      page.waitForResponse(response => response.request().method() === 'OPTIONS'),
      page.waitForResponse(response => response.request().method() === 'POST'),
      page.click(buttonS),
    ]);

    expect(serverResponse[0]?.headers()['access-control-allow-origin']).toEqual(`http://${SRV_HOST}:${SRV_PORT}`);
    await expect(serverResponse[1]?.json()).resolves.toMatchObject({ data: { user: { email: 'pippo@pluto.com' } } });

    await page.close();
  });

  it('should call start check payment, when app is loaded', async () => {
    // PRECONDITIONS
    const pmTab = await myBrowser.newPage();
    const [pmResponseApiDocs] = await Promise.all([
      pmTab.waitForResponse(response => response.request().method() === 'GET'),
      await pmTab.goto(`http://${PM_DOCK_HOST}:${PM_DOCK_PORT}/pp-restapi/v2/api-docs`),
    ]);

    expect(pmResponseApiDocs?.status()).toEqual(200);
    await pmTab.close();

    const page = await myBrowser.newPage();

    const body = {
      importoTotale: '95354.24',
      email: 'test.test@example.com',
      ragioneSociale: 'PagoPa',
      oggettoPagamento: 'Pagamento',
      bolloDigitale: 'false',
      codiceFiscale: 'OVYUIW25N63T952W',
      idCarrello: 'hx0gPsvSiIZy15L',
      iban: 'IT80W0990817267H5TMU57XNTJ3',
      language: '',
      idLogo: '',
      dettagli: [
        {
          iuv: 'iuv_qDkbzGEQjbFScXl',
          ccp: 'ccp_erCpMFWQYzpgXGV',
          idDominio: 'idD_obEpmnWaxGHrFSh',
          enteBeneficiario: 'Ironston TAFE',
          importo: '95354.24',
          tipoPagatore: 'F',
          codicePagatore: 'LHOXYX10Y50H466C',
          nomePagatore: 'Sabino Fior',
        },
      ],
    };

    const form_data = new FormData();

    // eslint-disable-next-line guard-for-in, no-var
    for (var key in body) {
      form_data.append(key, body[key]);
    }

    const response = await fetch(`http://${PM_DOCK_HOST}:8081/pa/send/rpt`, {
      method: 'PUT',
      body: form_data,
    });

    const idPayment = (await response.json()).idPayment;

    await page.goto(`http://${SRV_HOST}:${SRV_PORT}/index.html?p=${idPayment}`);
    await page.setViewport({ width: 1200, height: 907 });

    await Promise.all([page.waitForResponse(response => response.request().method() === 'GET')]);

    expect(sessionStorage.getItem('idPayment')).toEqual(idPayment);

    await page.close();
  });
});
