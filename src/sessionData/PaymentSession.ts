import * as t from 'io-ts';

const Dettaglio = t.exact(
  t.interface({
    IUV: t.string,

    codicePagatore: t.string,

    enteBeneficiario: t.string,

    importo: t.number,

    nomePagatore: t.string,
  }),
);

type Dettaglio = t.TypeOf<typeof Dettaglio>;

const Amount = t.exact(
  t.interface({
    amount: t.Integer,

    currency: t.string,

    decimalDigits: t.Integer,
  }),
);

type Amount = t.TypeOf<typeof Amount>;

export const PaymentSession = t.exact(
  t.interface({
    amount: Amount,

    detailsList: t.readonlyArray(Dettaglio, 'array of Dettaglio'),

    fiscalCode: t.string,

    idPayment: t.string,

    subject: t.string,
  }),
);

export type PaymentSession = t.TypeOf<typeof PaymentSession>;
