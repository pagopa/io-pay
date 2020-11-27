import * as t from "io-ts";


import { PaymentManagerClient } from '../pagopa';
import { defaultRetryingFetch } from '../../utils/fetch';
import { Millisecond } from "italia-ts-commons/lib/units";


const fetchPaymentManagerLongTimeout = t.Integer.decode(
  parseInt("10000", 10)
).getOrElse(20000) as Millisecond;

// Client for the PagoPA PaymentManager
const paymentManagerClient: PaymentManagerClient = PaymentManagerClient(
  "ciao", // put the url
  "walletToken",
  defaultRetryingFetch(),
  defaultRetryingFetch(fetchPaymentManagerLongTimeout, 0)
);