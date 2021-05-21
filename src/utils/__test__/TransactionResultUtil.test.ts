import {
  getOutcomeFromAuthcodeAndIsDirectAcquirer,
  NexiResultCodeEnum,
  OutcomeEnum,
  ViewOutcomeEnum,
  ViewOutcomeEnumType,
  VposResultCodeEnum,
} from '../TransactionResultUtil';

afterEach(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
});

describe('TransactionResultUtil', () => {
  it('should return Outcome with AuthorizationCode Nexi Pos', async () => {
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.SUCCESS, true)).toEqual(OutcomeEnum.SUCCESS);

    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.TIMEOUT, true)).toEqual(OutcomeEnum.TIMEOUT);

    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.RETRY_EXHAUSTED, true)).toEqual(
      OutcomeEnum.TIMEOUT,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.REFUSED_PAYMENT, true)).toEqual(
      OutcomeEnum.AUTH_ERROR,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.FAILED_3DS_AUTH, true)).toEqual(
      OutcomeEnum.AUTH_ERROR,
    );

    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.INVALID_CARD, true)).toEqual(
      OutcomeEnum.INVALID_CARD,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.EXPIRED_CARD, true)).toEqual(
      OutcomeEnum.INVALID_CARD,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.CARD_BRAND_NOT_PERMITTED, true)).toEqual(
      OutcomeEnum.INVALID_CARD,
    );

    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.INCORRECT_PARAMS, true)).toEqual(
      OutcomeEnum.INVALID_DATA,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.INCORRECT_MAC, true)).toEqual(
      OutcomeEnum.INVALID_DATA,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.INVALID_MAC_ALIAS, true)).toEqual(
      OutcomeEnum.INVALID_DATA,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.INVALID_APIKEY, true)).toEqual(
      OutcomeEnum.INVALID_DATA,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.INVALID_CONTRACT, true)).toEqual(
      OutcomeEnum.INVALID_DATA,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.INVALID_GROUP, true)).toEqual(
      OutcomeEnum.INVALID_DATA,
    );

    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.MAC_NOT_PRESENT, true)).toEqual(
      OutcomeEnum.MISSING_FIELDS,
    );

    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.NOT_FOUND, true)).toEqual(
      OutcomeEnum.CIRCUIT_ERROR,
    );

    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.DUPLICATE_TRANSACTION, true)).toEqual(
      OutcomeEnum.DUPLICATE_ORDER,
    );

    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.CANCELED_3DS_AUTH, true)).toEqual(
      OutcomeEnum.CANCELED_BY_USER,
    );

    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.EXCESSIVE_AMOUNT, true)).toEqual(
      OutcomeEnum.EXCESSIVE_AMOUNT,
    );

    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.TRANSACTION_NOT_FOUND, true)).toEqual(
      OutcomeEnum.ORDER_NOT_PRESENT,
    );

    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.FORBIDDEN_OPERATION, true)).toEqual(
      OutcomeEnum.INVALID_METHOD,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.UNAVAILABLE_METHOD, true)).toEqual(
      OutcomeEnum.INVALID_METHOD,
    );

    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.KO_RETRIABLE, true)).toEqual(
      OutcomeEnum.KO_RETRIABLE,
    );

    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.GENERIC_ERROR, true)).toEqual(
      OutcomeEnum.GENERIC_ERROR,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.INTERNAL_ERROR, true)).toEqual(
      OutcomeEnum.GENERIC_ERROR,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(NexiResultCodeEnum.INVALID_STATUS, true)).toEqual(
      OutcomeEnum.GENERIC_ERROR,
    );
  });

  it('should return Outcome with AuthorizationCode VPos', async () => {
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.SUCCESS, false)).toEqual(OutcomeEnum.SUCCESS);

    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.TIMEOUT, false)).toEqual(OutcomeEnum.TIMEOUT);

    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.REQREFNUM_INVALID, false)).toEqual(
      OutcomeEnum.INVALID_DATA,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.INCORRECT_FORMAT, false)).toEqual(
      OutcomeEnum.INVALID_DATA,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.INCORRECT_MAC_OR_TIMESTAMP, false)).toEqual(
      OutcomeEnum.INVALID_DATA,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.INCORRECT_DATE, false)).toEqual(
      OutcomeEnum.INVALID_DATA,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.TRANSACTION_ID_NOT_CONSISTENT, false)).toEqual(
      OutcomeEnum.INVALID_DATA,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.UNSUPPORTED_CURRENCY, false)).toEqual(
      OutcomeEnum.INVALID_DATA,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.UNSUPPORTED_EXPONENT, false)).toEqual(
      OutcomeEnum.INVALID_DATA,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.INVALID_PAN, false)).toEqual(
      OutcomeEnum.INVALID_DATA,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.XML_NOT_PARSABLE, false)).toEqual(
      OutcomeEnum.INVALID_DATA,
    );
    expect(
      getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.INSTALLMENT_NUMBER_OUT_OF_BOUNDS, false),
    ).toEqual(OutcomeEnum.INVALID_DATA);

    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.MISSING_CVV2, false)).toEqual(
      OutcomeEnum.MISSING_FIELDS,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.XML_EMPTY, false)).toEqual(
      OutcomeEnum.MISSING_FIELDS,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.TRANSACTION_ID_NOT_FOUND, false)).toEqual(
      OutcomeEnum.MISSING_FIELDS,
    );

    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.CIRCUIT_DISABLED, false)).toEqual(
      OutcomeEnum.CIRCUIT_ERROR,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.INSTALLMENTS_NOT_AVAILABLE, false)).toEqual(
      OutcomeEnum.CIRCUIT_ERROR,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.OPERATOR_NOT_FOUND, false)).toEqual(
      OutcomeEnum.CIRCUIT_ERROR,
    );

    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.TRANSACTION_FAILED, false)).toEqual(
      OutcomeEnum.AUTH_ERROR,
    );

    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.ORDER_OR_REQREFNUM_NOT_FOUND, false)).toEqual(
      OutcomeEnum.ORDER_NOT_PRESENT,
    );

    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.EXCEEDING_AMOUNT, false)).toEqual(
      OutcomeEnum.EXCESSIVE_AMOUNT,
    );

    expect(
      getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.PAYMENT_INSTRUMENT_NOT_ACCEPTED, false),
    ).toEqual(OutcomeEnum.INVALID_CARD);

    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.DUPLICATED_ORDER, false)).toEqual(
      OutcomeEnum.DUPLICATE_ORDER,
    );

    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.UNKNOWN_ERROR, false)).toEqual(
      OutcomeEnum.GENERIC_ERROR,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.APPLICATION_ERROR, false)).toEqual(
      OutcomeEnum.GENERIC_ERROR,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.REDIRECTION_3DS1, false)).toEqual(
      OutcomeEnum.GENERIC_ERROR,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.METHOD_REQUESTED, false)).toEqual(
      OutcomeEnum.GENERIC_ERROR,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.CHALLENGE_REQUESTED, false)).toEqual(
      OutcomeEnum.GENERIC_ERROR,
    );
    expect(getOutcomeFromAuthcodeAndIsDirectAcquirer(VposResultCodeEnum.INCORRECT_STATUS, false)).toEqual(
      OutcomeEnum.GENERIC_ERROR,
    );
  });

  it('should return ViewOutcomeEnum given ViewOutcome', async () => {
    expect(ViewOutcomeEnumType.decode(OutcomeEnum.AUTH_ERROR).getOrElse(ViewOutcomeEnum.GENERIC_ERROR)).toEqual(
      ViewOutcomeEnum.AUTH_ERROR,
    );
    expect(ViewOutcomeEnumType.decode(OutcomeEnum.INVALID_CARD).getOrElse(ViewOutcomeEnum.GENERIC_ERROR)).toEqual(
      ViewOutcomeEnum.INVALID_CARD,
    );
    expect(ViewOutcomeEnumType.decode(OutcomeEnum.EXCESSIVE_AMOUNT).getOrElse(ViewOutcomeEnum.GENERIC_ERROR)).toEqual(
      ViewOutcomeEnum.EXCESSIVE_AMOUNT,
    );
    expect(ViewOutcomeEnumType.decode(OutcomeEnum.CIRCUIT_ERROR).getOrElse(ViewOutcomeEnum.GENERIC_ERROR)).toEqual(
      ViewOutcomeEnum.GENERIC_ERROR,
    );
    expect(ViewOutcomeEnumType.decode(OutcomeEnum.DUPLICATE_ORDER).getOrElse(ViewOutcomeEnum.GENERIC_ERROR)).toEqual(
      ViewOutcomeEnum.GENERIC_ERROR,
    );
    expect(ViewOutcomeEnumType.decode(OutcomeEnum.INVALID_SESSION).getOrElse(ViewOutcomeEnum.GENERIC_ERROR)).toEqual(
      ViewOutcomeEnum.GENERIC_ERROR,
    );
    
  });
});
