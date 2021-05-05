import * as t from 'io-ts';
import { ErrorsEnumType } from '../js/errorhandler';

const ErrorTaskR = t.interface({
  type: ErrorsEnumType,
  event: t.string,
});

const ErrorTaskO = t.partial({ detail: t.string });

export const ErrorTask = t.intersection([ErrorTaskR, ErrorTaskO], 'ErrorTask');

export type ErrorTask = t.TypeOf<typeof ErrorTask>;
