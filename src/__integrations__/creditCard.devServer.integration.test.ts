import { Server } from 'http';

import { Browser, launch } from 'puppeteer';
import { createHttpTerminator } from 'http-terminator';
import devServer from './devServer';

describe('Credit Card Field', () => {
  const PORT = 5000;
  const HOST = 'localhost';

  it('should show a warning text when the credit card number is wrong', async () => {
    // Start server
    const myDevServer: Server = devServer.listen(PORT, HOST);
    const devServerTerminator = createHttpTerminator({ server: myDevServer });

    // Start the browser environment
    const myBrowser: Browser = await launch({ headless: true });
    const page = await myBrowser.newPage();

    await page.goto(`http://${HOST}:${PORT}/index.html?p=1234`);
    await page.setViewport({ width: 1200, height: 907 });

    const creditCardFieldS = '#creditcardnumber';
    await page.focus(creditCardFieldS);
    await page.keyboard.type('2324234342423');

    const errorMsgS = '.creditform > #creditcardform > .form-group > .is-invalid > .custom-label--error';

    const errorMsgV = await page.$eval(errorMsgS, element => element.textContent);

    expect(errorMsgV).toMatch(/Inserisci un numero valido/);
    await Promise.all([devServerTerminator.terminate(), myBrowser.close()]);
  });

  it('should handle Mastercard cards', async () => {
    // Start server
    const myDevServer: Server = devServer.listen(PORT, HOST);
    const devServerTerminator = createHttpTerminator({ server: myDevServer });

    // Start the browser environment
    const myBrowser: Browser = await launch({ headless: false });
    const page = await myBrowser.newPage();

    await page.goto(`http://${HOST}:${PORT}/index.html?p=1234`);
    await page.setViewport({ width: 1200, height: 907 });

    const creditCardFieldS = '#creditcardnumber';

    await page.focus(creditCardFieldS);
    await page.keyboard.type('5555555555554444');
    const checked = await page.$eval(creditCardFieldS, element => element.getAttribute('data-checked'));
    expect(checked).toMatch(/1/);

    await Promise.all([devServerTerminator.terminate(), myBrowser.close()]);
  });

  it('should handle Visa cards', async () => {
    // Start server
    const myDevServer: Server = devServer.listen(PORT, HOST);
    const devServerTerminator = createHttpTerminator({ server: myDevServer });

    // Start the browser environment
    const myBrowser: Browser = await launch({ headless: false });
    const page = await myBrowser.newPage();

    await page.goto(`http://${HOST}:${PORT}/index.html?p=1234`);
    await page.setViewport({ width: 1200, height: 907 });

    const creditCardFieldS = '#creditcardnumber';

    await page.focus(creditCardFieldS);
    await page.keyboard.type('4111111111111111');
    const checked = await page.$eval(creditCardFieldS, element => element.getAttribute('data-checked'));
    expect(checked).toMatch(/1/);

    await Promise.all([devServerTerminator.terminate(), myBrowser.close()]);
  });
});
