import { debug } from 'console';
import { Millisecond } from 'italia-ts-commons/lib/units';
import { fromNullable } from 'fp-ts/lib/Option';
import { toError } from 'fp-ts/lib/Either';
import { tryCatch } from 'fp-ts/lib/TaskEither';
import { createClient } from '../generated/definitions/pagopa/client';
import { actionsCheck } from './js/sessiondata';
import { initHeader } from './js/header';
import idpayguard from './js/idpayguard';
import { retryingFetch } from './utils/fetch';
import { getUrlParameter } from './js/urlUtilities';

// eslint-disable-next-line sonarjs/cognitive-complexity
document.addEventListener('DOMContentLoaded', async () => {
  const pmClient = createClient({
    baseUrl: 'http://localhost:8080',
    fetchApi: retryingFetch(fetch, 2000 as Millisecond, 3),
  });

  const idPayment = fromNullable(getUrlParameter('p')).getOrElse('');

  await tryCatch(
    () =>
      pmClient.checkPaymentUsingGET({
        id: idPayment,
      }),
    toError,
  )
    .fold(
      () => undefined, // MANAGE ERRORS
      myResExt =>
        sessionStorage.setItem(
          'paymentID',
          myResExt.fold(
            () => 'fakePaymentId',
            myRes => (myRes.status === 200 ? myRes.value.data.idPayment : 'fakePaymentId'),
          ),
        ),
    )
    .run();

  const useremail: HTMLInputElement | null = (document.getElementById('useremail') as HTMLInputElement) || null;
  const emailform: HTMLElement | null = document.getElementById('emailform') || null;
  const emailformInputs: NodeListOf<HTMLInputElement> | undefined = emailform?.querySelectorAll('input');
  const emailformSubmit: HTMLElement | null = emailform?.querySelector("button[type='submit']") || null;

  // actions/check FAKE IMPLEMENTATION
  actionsCheck();

  initHeader();

  idpayguard();

  // email validation
  function emailValidation(email: string): boolean {
    // eslint-disable-next-line
    const regpattern = new RegExp(
      /^(("[\w-\s]+")|([\w-]+(?:\.[\w-]+)*)|("[\w-\s]+")([\w-]+(?:\.[\w-]+)*))(@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][0-9]\.|1[0-9]{2}\.|[0-9]{1,2}\.))((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){2}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\]?$)/i,
    );
    return regpattern.test(email);
  }

  // Add / remove validity to input elements
  function toggleValid(el: Element, isItValid: boolean): void {
    if (isItValid === true) {
      el.parentElement?.classList.remove('is-invalid');
      el.parentElement?.classList.add('is-valid');
      el.classList.remove('is-invalid');
      el.classList.add('is-valid');
      el.setAttribute('data-checked', '1');
    } else {
      el.parentElement?.classList.remove('is-valid');
      el.parentElement?.classList.add('is-invalid');
      el.classList.remove('is-valid');
      el.classList.add('is-invalid');
      el.removeAttribute('data-checked');
    }
  }

  // check if all fields are OK
  function fieldsCheck() {
    const checkedFields = emailform?.querySelectorAll('input[data-checked]');
    if (checkedFields?.length === emailformInputs?.length) {
      emailformSubmit?.removeAttribute('disabled');
    } else {
      emailformSubmit?.setAttribute('disabled', '1'); // TODO: type should be bool
    }
  }
  // Event to check e-mail field value when user wrote something
  useremail?.addEventListener('keyup', function () {
    const inputel: HTMLInputElement = this as HTMLInputElement;

    if (emailValidation(inputel.value)) {
      toggleValid(inputel, true);
    } else {
      toggleValid(inputel, false);
    }
    fieldsCheck();
  });
  // Event to bind Submit button
  emailform?.addEventListener('submit', function (e) {
    e.preventDefault();
    // let's renew validation to avoid hacks
    if (emailValidation(useremail?.value)) {
      sessionStorage.setItem('useremail', useremail?.value);
      window.location.replace('inputcard.html');
    } else {
      emailformSubmit?.setAttribute('disabled', 'disabled');
    }
  });

  // If there is a value in sessionStorage
  if (sessionStorage.getItem('useremail') !== null) {
    // eslint-disable-next-line functional/immutable-data
    useremail.value = sessionStorage.getItem('useremail') || '';
    toggleValid(useremail, true);
    fieldsCheck();
  }
});
