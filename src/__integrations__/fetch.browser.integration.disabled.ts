import { Server } from 'http';
import { Browser, launch } from 'puppeteer';
import { createHttpTerminator } from 'http-terminator';
import stubServer from './stubServer';

jest.setTimeout(30000);

describe('Local server stub', () => {
  const PORT = process.env.FETCH_STUB_SRV_PORT ? parseInt(process.env.FETCH_STUB_SRV_PORT, 10) : 50000;
  const HOST = process.env.FETCH_STUB_SRV_HOST as string;
  const goodUrl = `http://${HOST}:${PORT}/good-response`;
  const badUrl = `http://${HOST}:${PORT}/transient-error`;

  it('should respond 404, when the user navigates to the bad endpoint', async () => {
    // Start server
    const myStubServer: Server = stubServer.listen(PORT, HOST);
    const stubServerTerminator = createHttpTerminator({ server: myStubServer });

    // Start the browser environment
    const myBrowser: Browser = await launch();
    const page = await myBrowser.newPage();

    const serverResponseKO = await page.goto(badUrl);
    expect(serverResponseKO).toBeTruthy();
    expect(serverResponseKO?.status()).toEqual(404);

    await Promise.all([stubServerTerminator.terminate(), myBrowser.close()]);
  });

  it('should respond 200, when the user navigates to the good endpoint', async () => {
    // Start server
    const myStubServer: Server = stubServer.listen(PORT, HOST);
    const stubServerTerminator = createHttpTerminator({ server: myStubServer });

    // Start the browser environment
    const myBrowser: Browser = await launch();
    const page = await myBrowser.newPage();

    const serverResponse = await page.goto(goodUrl);

    expect(serverResponse).toBeTruthy();
    await expect(serverResponse?.json()).resolves.toEqual({ msg: 'Hello World' });
    expect(serverResponse?.status()).toEqual(200);

    await Promise.all([stubServerTerminator.terminate(), myBrowser.close()]);
  });

  it('should respond 200, when the good endpoint is called with the browser standard fetch', async () => {
    // Start server
    const myStubServer: Server = stubServer.listen(PORT, HOST);
    const stubServerTerminator = createHttpTerminator({ server: myStubServer });

    // Start the browser environment
    const myBrowser: Browser = await launch();
    const page = await myBrowser.newPage();

    const [serverResponse] = await Promise.all([
      page.waitForResponse(response => response.request().method() === 'GET'),
      page.evaluate(
        url =>
          fetch(url, {
            headers: { 'upgrade-insecure-requests': '1' },
            method: 'GET',
          }),
        goodUrl,
      ),
    ]);

    await expect(serverResponse?.json()).resolves.toEqual({ msg: 'Hello World' });
    expect(serverResponse?.status()).toEqual(200);

    await Promise.all([stubServerTerminator.terminate(), myBrowser.close()]);
  });

  it('should return 404, when the bad endpoint is called via a transientConfigurableFetch', async () => {
    // Start server
    const myStubServer: Server = stubServer.listen(PORT, HOST);
    const stubServerTerminator = createHttpTerminator({ server: myStubServer });

    // Start the browser environment
    const myBrowser: Browser = await launch();
    const page = await myBrowser.newPage();
    await page.setBypassCSP(true);

    const [serverResponse] = await Promise.all([
      page.waitForResponse(response => response.url() === badUrl && response.request().method() === 'GET'),
      page.addScriptTag({ path: 'distTest/transientConfigurableFetch.js' }),
    ]);

    // The GET in test case transientConfigurableFetch is repeated 3 times, but this behaviour
    // is already unit tested, so for the purpose of this integration test it is sufficient
    // to assert that the custom fetch gets called just once and the server returns 404
    expect(serverResponse?.status()).toEqual(404);
    await Promise.all([stubServerTerminator.terminate(), myBrowser.close()]);
  });

  it('should return 404, when the bad endpoint is called via a retryingFetch', async () => {
    // Start server
    const myStubServer: Server = stubServer.listen(PORT, HOST);
    const stubServerTerminator = createHttpTerminator({ server: myStubServer });

    // Start the browser environment
    const myBrowser: Browser = await launch();
    const page = await myBrowser.newPage();
    await page.setBypassCSP(true);

    const [serverResponse] = await Promise.all([
      page.waitForResponse(response => response.url() === badUrl && response.request().method() === 'GET'),
      page.addScriptTag({ path: 'distTest/retryingFetch.js' }),
    ]);

    // The GET in test case defaultRetryingFetch is repeated 3 times, but this behaviour
    // is already unit tested, so for the purpose of this integration test it is sufficient
    // to assert that the custom fetch gets called just once and the server returns 404
    expect(serverResponse?.status()).toEqual(404);
    await Promise.all([stubServerTerminator.terminate(), myBrowser.close()]);
  });
});
