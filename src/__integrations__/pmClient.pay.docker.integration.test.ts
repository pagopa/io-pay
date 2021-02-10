import { fromNullable } from 'fp-ts/lib/Option';
import { Millisecond } from 'italia-ts-commons/lib/units';
import { createClient, Client } from '../../generated/definitions/pagopa/client';
import { retryingFetch } from '../utils/fetch';

describe('Endpoint xxxx of PM Client', () => {
  // eslint-disable-next-line functional/no-let
  let pmClient: Client;

  // eslint-disable-next-line functional/no-let
  let sessionToken: string;

  const PM_DOCK_PORT = process.env.PAYMENT_MANAGER_DOCKER_PORT
    ? parseInt(process.env.PAYMENT_MANAGER_DOCKER_PORT, 10)
    : 1234;
  const PM_DOCK_HOST = process.env.PAYMENT_MANAGER_DOCKER_HOST as string;

  beforeAll(async () => {
    // Start client
    pmClient = createClient({
      baseUrl: `http://${PM_DOCK_HOST}:${PM_DOCK_PORT}`,
      fetchApi: retryingFetch(fetch, 5000 as Millisecond, 5),
    });
    // Fetch a session token
    sessionToken = (
      await pmClient.startSessionUsingPOST({
        startSessionRequest: {
          data: {
            email: 'pippo@pluto.com',
            fiscalCode: 'HBBJUU78U89R556T',
            idPayment: 'c8860a83-c1e1-4cff-8a6d-e393b019a922',
          },
        },
      })
    ).fold(
      () => 'wrong_token',
      myRes => fromNullable(myRes.value?.data?.sessionToken).getOrElse('wrong_token'),
    );
  });

  it('should return 500 when the payload is wrong', async () => {
    expect(
      (
        await pmClient.payUsingPOST({
          Bearer: `Bearer ${sessionToken}`,
          id: 'e3f21fde-7d48-439a-ad52-b4f326d1ac6e',
          payRequest: {
            data: {},
          },
        })
      ).fold(
        err => (err.pop()?.value as Response).status,
        myRes => myRes.status,
      ),
    ).toEqual(200);
  });
});
