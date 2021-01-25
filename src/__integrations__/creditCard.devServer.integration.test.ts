// import { debug } from 'console';
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
    await page.waitForSelector(creditCardFieldS);
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
    const myBrowser: Browser = await launch({ headless: true });
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
    const myBrowser: Browser = await launch({ headless: true });
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

  it('should handle Maestro cards', async () => {
    // Start server
    const myDevServer: Server = devServer.listen(PORT, HOST);
    const devServerTerminator = createHttpTerminator({ server: myDevServer });

    // Start the browser environment
    const myBrowser: Browser = await launch({ headless: true });
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

    await Promise.all([devServerTerminator.terminate(), myBrowser.close()]);
  });

  it('should handle American Express cards', async () => {
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
    await page.keyboard.type('340024388482878');
    await expect(page.$eval(creditCardFieldS, element => element.getAttribute('data-checked'))).resolves.toMatch(/1/);

    await Promise.all([devServerTerminator.terminate(), myBrowser.close()]);
  });

  it('should remove data-checked attribute when the card number is removed', async () => {
    // Start server
    const myDevServer: Server = devServer.listen(PORT, HOST);
    const devServerTerminator = createHttpTerminator({ server: myDevServer });

    // Start the browser environment
    const myBrowser: Browser = await launch({ headless: true });
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
    await Promise.all([devServerTerminator.terminate(), myBrowser.close()]);
  });
});
