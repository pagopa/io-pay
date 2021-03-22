import { fromLeft, taskEither, TaskEither, tryCatch } from 'fp-ts/lib/TaskEither';
import { BrowserInfoResponse } from '../../generated/definitions/iopayportal/BrowserInfoResponse';
import { Client } from '../../generated/definitions/iopayportal/client';

export const getBrowserInfoTask = (iopayportalClient: Client): TaskEither<string, BrowserInfoResponse> =>
  tryCatch(
    () => iopayportalClient.GetBrowsersInfo({}),
    () => 'Errore recupero browserInfo',
  ).foldTaskEither(
    err => fromLeft(err),
    errorOrResponse =>
      errorOrResponse.fold(
        () => fromLeft('Errore recupero browserInfo'),
        responseType =>
          responseType.status !== 200
            ? fromLeft(`Errore recupero browserInfo : ${responseType.status}`)
            : taskEither.of(responseType.value),
      ),
  );
