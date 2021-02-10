import { launch } from 'puppeteer';

export async function getIdPayment(pmControlHost: string, pmControlPort: string) {
  const myBrowser = await launch({ headless: true });
  const page = await myBrowser.newPage();
  await page.goto(`http://${pmControlHost}:${pmControlPort}/pa/payment/gen/nodo`);
  const myButtonSelector = 'body #copyIdPayment';
  await page.waitForSelector(myButtonSelector);

  const [serverRes] = await Promise.all([
    page.waitForResponse(response => response.request().method() === 'PUT'),
    await page.click(myButtonSelector),
  ]);

  const myJson = (await serverRes.json()) as Record<string, string>;
  const idPayment = myJson.sessionId;

  await myBrowser.close();
  return idPayment;
}
