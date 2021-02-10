import { debug } from 'console';
import CreditCard from 'card-validator';
import { Millisecond } from 'italia-ts-commons/lib/units';
import * as TE from 'fp-ts/lib/TaskEither';
import { toError } from 'fp-ts/lib/Either';
import { fromNullable } from 'fp-ts/lib/Option';
import { createClient } from '../generated/definitions/pagopa/client';
import { TypeEnum } from '../generated/definitions/pagopa/Wallet';
import { setTranslateBtns } from './js/translateui';
import { modalWindows } from './js/modals';
import { initHeader } from './js/header';
import idpayguard from './js/idpayguard';
import { retryingFetch } from './utils/fetch';
// eslint-disable-next-line sonarjs/cognitive-complexity
document.addEventListener('DOMContentLoaded', () => {
  const pmClient = createClient({
    baseUrl: 'http://localhost:8080',
    fetchApi: retryingFetch(fetch, 2000 as Millisecond, 3),
  });

  const dropdownElements = document.querySelectorAll('.btn-dropdown');

  const privacyToggler = document.getElementById('privacyToggler') || null;
  const privacyTogglerInput = document.getElementById('privacyTogglerInput') || null;
  const obscureToggler = document.querySelectorAll('.obscureToggler') || null;
  const creditcardform = document.getElementById('creditcardform') || null;
  const creditcardformName = document.getElementById('creditcardname') || null;
  const creditcardformInputs = creditcardform ? creditcardform.querySelectorAll('input') : null;
  const creditcardformSubmit = creditcardform?.querySelectorAll("button[type='submit']")
    ? creditcardform.querySelectorAll("button[type='submit']")[0]
    : null;
  const creditcardformNumber = document.getElementById('creditcardnumber') || null;
  const creditcardformHolderIcon = document.getElementById('creditcardholdericon') || null;
  const creditcardformExpiration = document.getElementById('creditcardexpirationdate') || null;
  const creditcardformSecurecode = document.getElementById('creditcardsecurcode') || null;

  // check if all fields are OK
  function fieldsCheck() {
    const checkedFields = creditcardform?.querySelectorAll('input[data-checked]');

    if (checkedFields?.length === creditcardformInputs?.length) {
      creditcardformSubmit?.removeAttribute('disabled');
    } else {
      creditcardformSubmit?.setAttribute('disabled', '1'); // TODO: type should be bool
    }
  }

  // Add / remove validity to input elements
  function toggleValid(el: any, isItValid: any) {
    if (isItValid === true) {
      el.parentNode.classList.remove('is-invalid');
      el.parentNode.classList.add('is-valid');
      el.classList.remove('is-invalid');
      el.classList.add('is-valid');
      el.setAttribute('data-checked', 1);
    } else {
      el.parentNode.classList.remove('is-valid');
      el.parentNode.classList.add('is-invalid');
      el.classList.remove('is-valid');
      el.classList.add('is-invalid');
      el.removeAttribute('data-checked');
    }
  }

  // idpayguard
  idpayguard();

  // initHeader
  initHeader();

  // init translations
  setTranslateBtns();

  // init modals
  modalWindows();

  // dropdown
  dropdownElements.forEach(el => {
    el.addEventListener('click', function () {
      // const parentEl = el.parentNode;
      const opened = el.getAttribute('aria-expanded') === 'true';
      const target = el.getAttribute('data-target') || null;
      if (target == null) {
        return;
      }
      const targetEl = document.getElementById(target);
      targetEl?.addEventListener('click', function () {
        document.body.classList.remove('dropdown-opened');
        document.body.removeAttribute('data-dropdownopened');
        el.setAttribute('aria-expanded', 'false');
        // parentEl.classList.remove('show');
        el.parentElement?.classList.remove('show');
        targetEl.classList.remove('show');
      });

      if (opened === true) {
        document.body.classList.remove('dropdown-opened');
        document.body.removeAttribute('data-dropdownopened');
        el.setAttribute('aria-expanded', 'false');
        el.parentElement?.classList.remove('show');
        targetEl?.classList.remove('show');
      } else {
        document.body.classList.add('dropdown-opened');
        document.body.setAttribute('data-dropdownopened', target);
        el.setAttribute('aria-expanded', 'true');
        el.parentElement?.classList.add('show');
        targetEl?.classList.add('show');
      }
    });
  });

  privacyToggler?.addEventListener('click', function () {
    if (privacyTogglerInput == null) {
      return;
    }

    if (privacyTogglerInput.hasAttribute('checked') === true) {
      privacyTogglerInput.removeAttribute('checked');
      privacyTogglerInput.removeAttribute('data-checked');
    } else {
      privacyTogglerInput.setAttribute('checked', '1'); // TODO: should be bool
      privacyTogglerInput.setAttribute('data-checked', '1');
    }
    fieldsCheck();
  });

  obscureToggler.forEach(el => {
    el.addEventListener('click', () => {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const toggler: any = this;
      const target = toggler.getAttribute('data-obscuretarget') || null;
      if (target == null) {
        return;
      }
      const targetInput = document.getElementById(target);

      if (targetInput?.getAttribute('type') === 'text') {
        targetInput.setAttribute('type', 'password');
        toggler.setAttribute('data-obscured', 1);
      } else {
        targetInput?.setAttribute('type', 'text');
        toggler.removeAttribute('data-obscured');
      }
    });
  });

  creditcardform?.addEventListener(
    'submit',
    async function (e) {
      e.preventDefault();

      const useremail: string = sessionStorage.getItem('useremail') || '';
      const checkDataStored: string = sessionStorage.getItem('checkData') || '';
      const checkData = JSON.parse(checkDataStored);

      // Start Session to Fetch session token

      const mySessionToken = await TE.tryCatch(
        () =>
          pmClient.startSessionUsingPOST({
            startSessionRequest: {
              data: {
                email: fromNullable(useremail).getOrElse(''),
                idPayment: fromNullable(checkData.idPayment).getOrElse(''),
                fiscalCode: fromNullable(checkData.fiscalCode).getOrElse(''),
              },
            },
          }),
        toError,
      )
        .fold(
          () => undefined, // to be replaced with logic to handle failures
          myResExt => {
            const sessionToken = myResExt.fold(
              () => 'fakeSessionToken',
              myRes =>
                myRes.status === 200
                  ? fromNullable(myRes.value.data?.sessionToken).getOrElse('fakeSessionToken')
                  : 'fakeSessionToken',
            );
            sessionStorage.setItem('sessionToken', sessionToken);
            return sessionToken;
          },
        )
        .run();

      // debug(`Bearer ${mySessionToken}`);
      await TE.tryCatch(
        () =>
          pmClient.approveTermsUsingPOST({
            Bearer: `Bearer ${mySessionToken}`,
            approveTermsRequest: {
              data: {
                terms: true,
                privacy: true,
              },
            },
          }),
        toError,
      )
        .fold(
          () => undefined, // to be replaced with logic to handle failures
          myResExt => {
            const approvalState = myResExt.fold(
              () => 'noApproval',
              myRes => (myRes.status === 200 ? JSON.stringify(myRes.value.data) : 'noApproval'),
            );
            sessionStorage.setItem('approvalState', approvalState);
          },
        )
        .run();

      await TE.tryCatch(
        () =>
          pmClient.addWalletUsingPOST({
            Bearer: `Bearer ${mySessionToken}`,
            walletRequest: {
              data: {
                type: TypeEnum.CREDIT_CARD,
                creditCard: {
                  expireMonth: (creditcardformExpiration as HTMLInputElement).value.split('/')[0],
                  expireYear: (creditcardformExpiration as HTMLInputElement).value.split('/')[1],
                  holder: (creditcardformName as HTMLInputElement).value.trim(),
                  pan: (creditcardformNumber as HTMLInputElement).value.trim(),
                  securityCode: (creditcardformSecurecode as HTMLInputElement).value,
                },
                idPagamentoFromEC: checkData.idPayment, // needs to exist
              },
            },
            language: 'it',
          }),
        toError,
      )
        .fold(
          () => void 0, // to be replaced with logic to handle failures
          myResExt => {
            const walletResp = myResExt.fold(
              () => 'fakeCC',
              myRes => (myRes.status === 200 ? JSON.stringify(myRes.value.data) : 'fakeWallet'),
            );
            sessionStorage.setItem('wallet', walletResp);
            window.location.replace('check.html');
          },
        )
        .run();

      /*
      
      creditcardformInputs?.forEach(el => {
              sessionStorage.setItem(el.getAttribute('name')?.trim() || '', el.value);
            });
            window.location.replace('check.html');
      */
    },
    false,
  );

  // VALIDATIONS --------------------------
  // Name Surname (at least two words)
  creditcardformName?.addEventListener('keyup', function () {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const inputel: any = this;
    // var stringpattern = "(\\w.+\\s).+";
    // const stringpattern = "^[A-Za-zÀ-ÖØ-öø-ÿ 'w -]+$";

    const regpatternCharacther = new RegExp("^[A-Za-zÀ-ÖØ-öø-ÿ 'w -].{1,42}$", 'i');
    const regpatternAtLeastOneSpace = new RegExp('(\\w.+\\s).+', 'i');

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    regpatternCharacther.test(inputel.value) === true && regpatternAtLeastOneSpace.test(inputel.value)
      ? toggleValid(inputel, true)
      : toggleValid(inputel, false);
    fieldsCheck();
  });

  // Creditcard specific
  creditcardformNumber?.addEventListener('keyup', function () {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const inputel: any = this;
    // eslint-disable-next-line functional/no-let
    let holder = null;
    const ccelems = creditcardformHolderIcon?.getElementsByClassName('.ccicon--custom');
    const creditCardValidation = CreditCard.number(inputel.value);

    if (ccelems) {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      ccelems.length > 0 &&
        Array.from(ccelems).forEach(element => {
          element.classList.remove('d-block');
        });
    }

    if (creditCardValidation.isValid === true) {
      toggleValid(inputel, true);
      holder = creditCardValidation?.card?.type.toLowerCase();

      const ccelem = creditcardformHolderIcon?.getElementsByClassName(holder || '');

      if (ccelem && ccelem.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        ccelem[0].classList.add('d-block');
      }
    } else {
      toggleValid(inputel, false);
      holder = null;
    }
    fieldsCheck();
  });

  creditcardformExpiration?.addEventListener('keyup', function () {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const inputel: any = this;

    const dateValidation = CreditCard.expirationDate(inputel.value);

    if (dateValidation.isValid === true) {
      toggleValid(inputel, true);
    } else {
      toggleValid(inputel, false);
    }

    fieldsCheck();
  });

  creditcardformSecurecode?.addEventListener('keyup', function () {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const inputel: any = this;
    // const creditCardValidation = CreditCard.number(creditcardformNumber?.value);
    const creditCardValidation = CreditCard.number(creditcardformNumber?.innerText);
    const cvvSize = creditCardValidation.card !== null ? creditCardValidation.card.code.size : 3;

    const cvvValidation = CreditCard.cvv(inputel.value, cvvSize);

    if (cvvValidation.isValid === true) {
      toggleValid(inputel, true);
    } else {
      toggleValid(inputel, false);
    }
    fieldsCheck();
  });
});
