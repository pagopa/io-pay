import { Millisecond } from 'italia-ts-commons/lib/units';
import nodeFetch from 'node-fetch';
import { right } from 'fp-ts/lib/Either';
import { Client, createClient } from '../../../generated/definitions/iopayportal/client';
import { retryingFetch } from '../fetch';
import { getBrowserInfoTask, getEMVCompliantColorDepth } from '../checkHelper';

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

describe('CheckHelper', () => {
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

  it('should return colorDepth in input if it is EMV Compliant Color Depth', async () => {
    expect(getEMVCompliantColorDepth(1)).toEqual(1);
    expect(getEMVCompliantColorDepth(4)).toEqual(4);
    expect(getEMVCompliantColorDepth(8)).toEqual(8);
    expect(getEMVCompliantColorDepth(15)).toEqual(15);
    expect(getEMVCompliantColorDepth(16)).toEqual(16);
    expect(getEMVCompliantColorDepth(24)).toEqual(24);
    expect(getEMVCompliantColorDepth(32)).toEqual(32);
    expect(getEMVCompliantColorDepth(48)).toEqual(48);
  });

  it('should return max colorDepth if it is outside the range of EMV Compliant Colors Depth', async () => {
    expect(getEMVCompliantColorDepth(50)).toEqual(48);
    expect(getEMVCompliantColorDepth(49)).toEqual(48);
    expect(getEMVCompliantColorDepth(0)).toEqual(48);
    expect(getEMVCompliantColorDepth(-1)).toEqual(48);
  });

  it('should return the maximum valid colorDepth below the given colorDepth', async () => {
    expect(getEMVCompliantColorDepth(2)).toEqual(1);
    expect(getEMVCompliantColorDepth(5)).toEqual(4);
    expect(getEMVCompliantColorDepth(30)).toEqual(24);
    expect(getEMVCompliantColorDepth(33)).toEqual(32);
    expect(getEMVCompliantColorDepth(47)).toEqual(32);
  });
});
