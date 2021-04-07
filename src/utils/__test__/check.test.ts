import { Millisecond } from 'italia-ts-commons/lib/units';
import nodeFetch from 'node-fetch';
import { right } from 'fp-ts/lib/Either';
import { Client, createClient } from '../../../generated/definitions/iopayportal/client';
import { retryingFetch } from '../fetch';
import { getBrowserInfoTask } from '../checkHelper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any,functional/immutable-data
(global as any).fetch = nodeFetch;

afterEach(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
});

const ioPayPortalClient: Client = createClient({
  baseUrl: 'http://localhost:8080',
  fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
});

const browserInfo = { ip: '0.0.0.0', useragent: 'useragent', accept: 'application/json' };

describe('TransactionHelper', () => {
  it('should return 200 with browserInfo if GetBrowsersInfo is successfull', async () => {
    jest.spyOn(ioPayPortalClient, 'GetBrowsersInfo').mockReturnValueOnce(
      Promise.resolve(
        right({
          headers: {},
          status: 200,
          value: browserInfo,
        }),
      ),
    );

    const result = await getBrowserInfoTask(ioPayPortalClient).run();

    expect(ioPayPortalClient.GetBrowsersInfo).toHaveBeenCalledTimes(1);
    expect(result.isRight()).toEqual(true);
    expect(result.getOrElse({ ip: '', useragent: '', accept: '' })).toEqual(browserInfo);
  });

  it('should return Errore recupero browserInfo if GetBrowsersInfo return 500', async () => {
    jest.spyOn(ioPayPortalClient, 'GetBrowsersInfo').mockReturnValueOnce(
      Promise.resolve(
        right({
          headers: {},
          status: 500,
          value: undefined,
        }),
      ),
    );

    const result = await getBrowserInfoTask(ioPayPortalClient).run();

    expect(ioPayPortalClient.GetBrowsersInfo).toHaveBeenCalledTimes(1);
    expect(result.isLeft()).toEqual(true);
  });
});
