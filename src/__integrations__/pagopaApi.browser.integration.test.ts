import { Server } from 'http';

import { Browser, launch } from 'puppeteer';
import { createHttpTerminator } from 'http-terminator';
import stubServer from './stubServer';

describe('Test the browser test environment', () => {
  it('Puppeteer should work', async () => {
    const myBrowser: Browser = await launch();
    const page = await myBrowser.newPage();
    const [result] = await Promise.all([
      page.waitForResponse(response => response.url() === 'https://api.ratesapi.io/api/latest'),
      page.evaluate(() =>
        fetch('https://api.ratesapi.io/api/latest', {
          headers: {},
          method: 'GET',
        }),
      ),
    ]);
    await expect(result.json()).resolves.toHaveProperty('base');
    await myBrowser.close();
  });
});

describe('Custom Fetches test in browser environment', () => {
  const PORT = 5000;
  const HOST = 'localhost';

  it('When the user navigate to the bad endpoint of the local server, it should respond 404', async () => {
    // Start server
    const myStubServer: Server = stubServer.listen(PORT, HOST);
    const stubServerTerminator = createHttpTerminator({ server: myStubServer });

    // Start the browser environment
    const myBrowser: Browser = await launch();
    const page = await myBrowser.newPage();

    // page.goto doesn't throw (different behaviour from fetch or page.evaluate)
    const serverResponseKO = await page.goto(`http://${HOST}:${PORT}/transient-error`);
    expect(serverResponseKO).toBeTruthy();
    expect(serverResponseKO?.status()).toEqual(404);

    await Promise.all([stubServerTerminator.terminate(), myBrowser.close()]);
  });

  it('When the user navigate to the good endpoint of local server, it should respond 200', async () => {
    // Start server
    const myStubServer: Server = stubServer.listen(PORT, HOST);
    const stubServerTerminator = createHttpTerminator({ server: myStubServer });

    // Start the browser environment
    const myBrowser: Browser = await launch();
    const page = await myBrowser.newPage();

    // page.goto doesn't throw (different behaviour from fetch or page.evaluate)
    const serverResponse = await page.goto(`http://${HOST}:${PORT}/good-response`);

    expect(serverResponse).toBeTruthy();
    await expect(serverResponse?.json()).resolves.toEqual({ msg: 'Hello World' });
    expect(serverResponse?.status()).toEqual(200);

    await myBrowser.close();
    await stubServerTerminator.terminate();
  });

  it('When the good endpoint of the server stub is called with the browser standard fetch, it should respond 200', async () => {
    // Start server
    const myStubServer: Server = stubServer.listen(PORT, HOST);
    const stubServerTerminator = createHttpTerminator({ server: myStubServer });

    // Start the browser environment
    const myBrowser: Browser = await launch();
    const page = await myBrowser.newPage();

    const [serverResponse] = await Promise.all([
      page.waitForResponse(response => response.request().method() === 'GET'),
      page.evaluate(() =>
        // Can't use the variables HOST and PORT since the string is computed in the context of the browser
        fetch(`http://localhost:5000/good-response`, {
          headers: { 'upgrade-insecure-requests': '1' },
          method: 'GET',
        }),
      ),
    ]);

    await expect(serverResponse?.json()).resolves.toEqual({ msg: 'Hello World' });
    expect(serverResponse?.status()).toEqual(200);

    await Promise.all([stubServerTerminator.terminate(), myBrowser.close()]);
  });

  it('When the bad endpoint of the server stub is called via a transientConfigurableFetch, it should return 404', async () => {
    // Start server
    const myStubServer: Server = stubServer.listen(PORT, HOST);
    const stubServerTerminator = createHttpTerminator({ server: myStubServer });

    // Start the browser environment
    const myBrowser: Browser = await launch();
    const page = await myBrowser.newPage();
    await page.setBypassCSP(true);

    const [serverResponse] = await Promise.all([
      page.waitForResponse(
        response =>
          response.url() === `http://${HOST}:${PORT}/transient-error` && response.request().method() === 'GET',
      ),
      page.addScriptTag({ path: './testCases/transientConfigurableFetch.js' }),
    ]);

    // The GET in test case transientConfigurableFetch is repeated 3 times, but this behaviour
    // is already unit tested, so for the purpose of this integration test it is sufficient
    // to assert that the custom fetch gets called and the server returns 404
    expect(serverResponse?.status()).toEqual(404);
    await Promise.all([stubServerTerminator.terminate(), myBrowser.close()]);
  });

  it('When the bad endpoint of the server stub is called via a defaultRetryingFetch,, it should return 404', async () => {
    // Start server
    const myStubServer: Server = stubServer.listen(PORT, HOST);
    const stubServerTerminator = createHttpTerminator({ server: myStubServer });

    // Start the browser environment
    const myBrowser: Browser = await launch();
    const page = await myBrowser.newPage();
    await page.setBypassCSP(true);

    const [serverResponse] = await Promise.all([
      page.waitForResponse(
        response =>
          response.url() === `http://${HOST}:${PORT}/transient-error` && response.request().method() === 'GET',
      ),
      page.addScriptTag({ path: './testCases/defaultRetryingFetch.js' }),
    ]);

    // The GET in test case defaultRetryingFetch is repeated 3 times, but this behaviour
    // is already unit tested, so for the purpose of this integration test it is sufficient
    // to assert that the custom fetch gets called and the server returns 404
    expect(serverResponse?.status()).toEqual(404);
    await Promise.all([stubServerTerminator.terminate(), myBrowser.close()]);
  });
});
