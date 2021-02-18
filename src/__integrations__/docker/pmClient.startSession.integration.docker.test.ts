import { Millisecond } from 'italia-ts-commons/lib/units';
import 'abort-controller/polyfill';
import nodeFetch from 'node-fetch';
import { createClient, Client } from '../../../generated/definitions/pagopa/client';
import { retryingFetch } from '../../utils/fetch';
import { getIdPayment } from '../../utils/testUtils';
import { OsEnum } from '../../../generated/definitions/pagopa/Device';
// eslint-disable-next-line @typescript-eslint/no-explicit-any,functional/immutable-data
(global as any).fetch = nodeFetch;

describe('Endpoint start-session of PM', () => {
  // Set the testing environment

  const PM_DOCK_PORT = process.env.PAYMENT_MANAGER_DOCKER_PORT
    ? parseInt(process.env.PAYMENT_MANAGER_DOCKER_PORT, 10)
    : 1234;
  const PM_DOCK_HOST = process.env.PAYMENT_MANAGER_DOCKER_HOST as string;
  const PM_DOCK_CTRL_PORT = process.env.PAYMENT_MANAGER_DOCKER_CONTROL_PORT
    ? parseInt(process.env.PAYMENT_MANAGER_DOCKER_CONTROL_PORT, 10)
    : 8081;
  // eslint-disable-next-line functional/no-let
  let pmClient: Client;

  // eslint-disable-next-line functional/no-let
  let myIdPayment: string;

  beforeAll(async () => {
    // Start client
    pmClient = createClient({
      baseUrl: `http://${PM_DOCK_HOST}:${PM_DOCK_PORT}`,
      fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
    });
  });

  beforeEach(async () => {
    // Execute the Happy Path before testing payment
    myIdPayment = await getIdPayment(PM_DOCK_HOST, PM_DOCK_CTRL_PORT.toString());
  });

  it("should return the same notificationEmail when it's called with or without device", async () => {
    const pmResponse = await pmClient.startSessionUsingPOST({
      startSessionRequest: {
        data: {
          email: 'nunzia.ross@example.com',
          fiscalCode: 'UQNSFM56P12T733D',
          idPayment: myIdPayment,
        },
      },
    });

    const pmResponseWithDevice = await pmClient.startSessionUsingPOST({
      startSessionRequest: {
        data: {
          email: 'nunzia.ross@example.com',
          idPayment: myIdPayment,
          fiscalCode: 'UQNSFM56P12T733D',
          device: {
            os: 'ANDROID' as OsEnum,
          },
        },
      },
    });

    expect(
      pmResponse.fold(
        () => undefined,
        myRes => myRes.value?.user?.notificationEmail,
      ),
    ).toEqual(
      pmResponseWithDevice.fold(
        () => undefined,
        myRes => myRes.value?.user?.notificationEmail,
      ),
    );
  });

  it('should return ANONYMOUS as user state when she feeds an email', async () => {
    expect(
      (
        await pmClient.startSessionUsingPOST({
          startSessionRequest: {
            data: {
              email: 'nunzia.ross@example.com',
              fiscalCode: 'UQNSFM56P12T733D', // seems to be ignored by PM
              idPayment: myIdPayment, // seems to be ignored by PM
            },
          },
        })
      ).fold(
        () => undefined,
        myRes => myRes.value?.user?.status,
      ),
    ).toEqual('ANONYMOUS');
  });

  it('should return a sessionToken when the user feeds an email', async () => {
    const pmResponse = await pmClient.startSessionUsingPOST({
      startSessionRequest: {
        data: {
          email: 'nunzia.ross@example.com',
          fiscalCode: 'UQNSFM56P12T733D', // seems to be ignored by PM
          idPayment: myIdPayment, // seems to be ignored by PM
        },
      },
    });
    expect(
      pmResponse.fold(
        () => undefined,
        myRes => myRes.value?.sessionToken,
      ),
    ).toMatch(/[\d\w]{128}/i);

    expect(
      pmResponse.fold(
        () => undefined,
        myRes => myRes.value?.sessionToken,
      ),
    ).not.toMatch(/[\d\w]{129}/i);
  });
});
