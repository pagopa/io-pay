// import { debug as cdebug } from 'console';
import { Browser, launch } from 'puppeteer';

describe('Hover over image test:', () => {
  it('weak test', async () => {
    const myBrowser: Browser = await launch();
    const page = await myBrowser.newPage();
    const result = await page.evaluate(() =>
      fetch('https://api.ratesapi.io/api/latest', {
        headers: {},
        method: 'GET',
      }).then(x => x.json()),
    );

    expect(result.base).toEqual('EUR');
    await myBrowser.close();
  });
  /* afterEach(async () => {
    
  }); */
});
