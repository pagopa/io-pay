import * as t from 'io-ts';
import { ErrorsEnumType } from '../js/errorhandler';

const ErrorTaskR = t.interface({
  type: ErrorsEnumType,
});

const ErrorTaskO = t.partial({ event: t.string });

export const ErrorTask = t.intersection([ErrorTaskR, ErrorTaskO], 'ErrorTask');

export type ErrorTask = t.TypeOf<typeof ErrorTask>;
