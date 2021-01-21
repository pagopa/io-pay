import { debug } from 'console';
import { Server } from 'http';

import { Browser, launch } from 'puppeteer';
import { createHttpTerminator } from 'http-terminator';
import devServer from './devServer';

describe('Custom Fetches test in browser environment', () => {
  const PORT = 5000;
  const HOST = 'localhost';

  it('When the user navigate to the bad endpoint of the local server, it should respond 404', async () => {
    // Start server
    const myDevServer: Server = devServer.listen(PORT, HOST);
    const devServerTerminator = createHttpTerminator({ server: myDevServer });

    // Start the browser environment
    const myBrowser: Browser = await launch();
    const page = await myBrowser.newPage();

    const serverResponse = await page.goto(`http://${HOST}:${PORT}/?p=1234`);
    debug(await serverResponse?.text());

    await Promise.all([devServerTerminator.terminate(), myBrowser.close()]);
  });
});
