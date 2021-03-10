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
import { initDropdowns } from './js/dropdowns';
import { getConfigOrThrow } from './utils/config';

// eslint-disable-next-line sonarjs/cognitive-complexity
document.addEventListener('DOMContentLoaded', () => {
  const pmClient = createClient({
    baseUrl: getConfigOrThrow().IO_PAY_PAYMENT_MANAGER_HOST,
    fetchApi: retryingFetch(fetch, 2000 as Millisecond, 3),
  });

  const privacyToggler = document.getElementById('privacyToggler') || null;
  const privacyTogglerInput = document.getElementById('privacyTogglerInput') || null;
  const obscureToggler = document.querySelectorAll('.obscureToggler') || null;
  const creditcardform = document.getElementById('creditcardform') || null;
  const creditcardformName = document.getElementById('creditcardname') || null;
  const creditcardformInputs = creditcardform ? creditcardform.querySelectorAll('input') : null;
  const creditcardformSubmit = creditcardform?.querySelectorAll("button[type='submit']")
    ? creditcardform.querySelectorAll("button[type='submit']")[0]
    : null;
  const creditcardformNumber = (document.getElementById('creditcardnumber') as HTMLInputElement) || null;
  const creditcardformHolderIcon = (document.getElementById('creditcardholdericon') as HTMLElement) || null;
  const creditcardformExpiration = document.getElementById('creditcardexpirationdate') || null;
  const creditcardformSecurecode = (document.getElementById('creditcardsecurcode') as HTMLInputElement) || null;
  const modalAndTerm = document.getElementById('modal-inputcardterms') || null;
  const creditcardsecurcodeError = document.getElementById('creditcardsecurcodeError') || null;
  const creditcardsecurcodeLabel = document.getElementById('creditcardsecurcodeLabel') || null;
  const securecodeErrorMessages = {
    3: 'Inserisci 3 cifre',
    4: 'Inserisci 4 cifre',
  };
  const securecodePlaceholders = {
    3: '123',
    4: '1234',
  };
  const securecodeLabels = {
    3: 'codice di sicurezza',
    4: 'CID (4 cifre)',
  };

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

  // Custom validator for CVV
  function checkCvvSize(): void {
    const size = (creditcardformSecurecode && creditcardformSecurecode.getAttribute('data-validator-size')) || '3';
    const cvvSize = parseInt(size, 10);
    const value = creditcardformSecurecode.value || '';
    const onlyNumbers = new RegExp('^\\d+$');

    if (creditcardsecurcodeError) {
      // eslint-disable-next-line functional/immutable-data
      (creditcardsecurcodeError as HTMLElement).innerText = securecodeErrorMessages[cvvSize];
    }

    if (value.length === cvvSize && onlyNumbers.test(value)) {
      toggleValid(creditcardformSecurecode, true);
    } else {
      toggleValid(creditcardformSecurecode, false);
    }
  }

  // idpayguard
  idpayguard();

  // initHeader
  initHeader();

  initDropdowns();

  // init translations
  setTranslateBtns();

  // init modals
  modalWindows();

  // get and set terms of services
  async function setTermOfService() {
    await TE.tryCatch(() => pmClient.getResourcesUsingGET({ language: 'it' }), toError)
      .fold(
        () => undefined, // to be replaced with logic to handle failures
        myResExt => {
          const termini = myResExt.fold(
            () => 'notFound :(',
            myRes => (myRes.status === 200 ? myRes.value?.data?.termsAndConditions : 'notFound :('),
          );
          const termsAndService = modalAndTerm?.querySelector('.modalwindow__content');
          if (termsAndService) {
            // eslint-disable-next-line functional/immutable-data
            termsAndService.innerHTML = termini;
          }
        },
      )
      .run();
  }

  void setTermOfService();

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
    el.addEventListener('click', evt => {
      const toggler = evt.target as Element;
      const target = toggler?.getAttribute('data-obscuretarget') || null;
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
                  ? fromNullable(myRes.value.sessionToken).getOrElse('fakeSessionToken')
                  : 'fakeSessionToken',
            );
            sessionStorage.setItem('sessionToken', sessionToken);
            return sessionToken;
          },
        )
        .run();

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
            sessionStorage.setItem('securityCode', (creditcardformSecurecode as HTMLInputElement).value);
            window.location.replace('check.html');
          },
        )
        .run();
    },
    false,
  );

  // VALIDATIONS --------------------------
  // Name Surname (at least two words)
  creditcardformName?.addEventListener('keyup', evt => {
    const inputel: HTMLInputElement = evt?.target as HTMLInputElement;

    const regpattern = new RegExp(/^[a-zA-Z]+[\s']+([a-zA-Z]+[\s']*){1,}$/);

    if (regpattern.test(inputel.value) === true) {
      toggleValid(inputel, true);
    } else {
      toggleValid(inputel, false);
    }
    fieldsCheck();
  });

  // Creditcard specific
  creditcardformNumber?.addEventListener('keyup', evt => {
    const inputel = (evt.target as HTMLInputElement) || null;
    // eslint-disable-next-line functional/no-let
    let holder = '';
    const ccelems = creditcardformHolderIcon?.querySelectorAll('use.ccicon--custom') || [];
    const creditCardValidation = CreditCard.number(inputel.value);
    if (ccelems && ccelems.length > 0) {
      Array.from(ccelems).forEach(element => {
        (element as HTMLElement).classList.remove('d-block');
      });
    }

    if (creditCardValidation.isValid === true) {
      toggleValid(inputel, true);
      if (creditCardValidation.card) {
        holder = creditCardValidation.card.type.toLowerCase() || '';
        creditcardformSecurecode.setAttribute('data-validator-size', creditCardValidation.card.code.size.toString());
        // modify placeholder value with cvv size
        creditcardformSecurecode.setAttribute(
          'placeholder',
          securecodePlaceholders[creditCardValidation.card.code.size],
        );

        if (creditcardsecurcodeLabel) {
          // eslint-disable-next-line functional/immutable-data
          creditcardsecurcodeLabel.innerText = securecodeLabels[creditCardValidation.card.code.size];
        }
      }
      const ccelem = creditcardformHolderIcon?.getElementsByClassName(holder);

      if (ccelem && ccelem.length > 0) {
        (ccelem[0] as HTMLElement).classList.add('d-block');
      }
    } else {
      toggleValid(inputel, false);
      holder = '';
    }
    // if cvv field is filled, check the value
    if (creditcardformSecurecode.value !== '') {
      checkCvvSize();
    }
    fieldsCheck();
  });

  creditcardformExpiration?.addEventListener('keyup', evt => {
    const inputel = evt?.target as HTMLInputElement;
    if (inputel.value.length > 2 && inputel.value.indexOf('/') !== 2) {
      // eslint-disable-next-line functional/immutable-data
      inputel.value = inputel.value.slice(0, 2) + '/' + inputel.value.slice(2);
    }
    const value = inputel.value;
    const dateValidation = CreditCard.expirationDate(value);

    if (dateValidation.isValid === true) {
      toggleValid(inputel, true);
    } else {
      toggleValid(inputel, false);
    }

    fieldsCheck();
  });

  creditcardformSecurecode?.addEventListener('keyup', () => {
    checkCvvSize();
    fieldsCheck();
  });
});
