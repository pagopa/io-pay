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
import { track } from './__mocks__/mocks';
import {
  PAYMENT_APPROVE_TERMS_INIT,
  PAYMENT_APPROVE_TERMS_NET_ERR,
  PAYMENT_APPROVE_TERMS_RESP_ERR,
  PAYMENT_APPROVE_TERMS_SUCCESS,
  PAYMENT_APPROVE_TERMS_SVR_ERR,
  PAYMENT_RESOURCES_INIT,
  PAYMENT_RESOURCES_NET_ERR,
  PAYMENT_RESOURCES_RESP_ERR,
  PAYMENT_RESOURCES_SUCCESS,
  PAYMENT_RESOURCES_SVR_ERR,
  PAYMENT_START_SESSION_INIT,
  PAYMENT_START_SESSION_NET_ERR,
  PAYMENT_START_SESSION_RESP_ERR,
  PAYMENT_START_SESSION_SUCCESS,
  PAYMENT_START_SESSION_SVR_ERR,
  PAYMENT_WALLET_INIT,
  PAYMENT_WALLET_NET_ERR,
  PAYMENT_WALLET_RESP_ERR,
  PAYMENT_WALLET_SUCCESS,
  PAYMENT_WALLET_SVR_ERR,
} from './utils/mixpanelHelperInit';

// eslint-disable-next-line sonarjs/cognitive-complexity
document.addEventListener('DOMContentLoaded', () => {
  const pmClient = createClient({
    baseUrl: 'http://localhost:8080',
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
      creditcardformSubmit?.setAttribute('disabled', '1'); // FIXME: type should be bool
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
    track(PAYMENT_RESOURCES_INIT.value, { EVENT_ID: PAYMENT_RESOURCES_INIT.value });
    await TE.tryCatch(
      () => pmClient.getResourcesUsingGET({ language: 'it' }),
      // TODO: #RENDERING_ERROR - errore dovuto a variazione API ?
      e => {
        track(PAYMENT_RESOURCES_NET_ERR.value, { EVENT_ID: PAYMENT_RESOURCES_NET_ERR.value, e });
        return toError;
      },
    )
      .fold(
        r => {
          // TODO: #RENDERING_ERROR
          track(PAYMENT_RESOURCES_SVR_ERR.value, { EVENT_ID: PAYMENT_RESOURCES_SVR_ERR.value, r });
        },
        myResExt => {
          const termini = myResExt.fold(
            () => 'notFound :(', // empty data ???
            myRes => {
              track(myRes.status === 200 ? PAYMENT_RESOURCES_SUCCESS.value : PAYMENT_RESOURCES_RESP_ERR.value, {
                EVENT_ID: myRes.status === 200 ? PAYMENT_RESOURCES_SUCCESS.value : PAYMENT_RESOURCES_RESP_ERR.value,
              });
              return myRes.status === 200 ? myRes.value?.data?.termsAndConditions : 'notFound :(';
            },
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

      track(PAYMENT_START_SESSION_INIT.value, {
        EVENT_ID: PAYMENT_START_SESSION_INIT.value,
        idPayment: checkData.idPayment,
      });
      // 1. Start Session to Fetch session token
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
        e => {
          // TODO: #RENDERING_ERROR
          track(PAYMENT_START_SESSION_NET_ERR.value, { EVENT_ID: PAYMENT_START_SESSION_NET_ERR.value, e });
          return toError;
        },
      )
        .fold(
          r => {
            // TODO: #RENDERING_ERROR
            track(PAYMENT_START_SESSION_SVR_ERR.value, { EVENT_ID: PAYMENT_START_SESSION_SVR_ERR.value, r });
          }, // to be replaced with logic to handle failures
          myResExt => {
            const sessionToken = myResExt.fold(
              () => 'fakeSessionToken',
              myRes => {
                if (myRes.status === 200) {
                  track(PAYMENT_START_SESSION_SUCCESS.value, {
                    EVENT_ID: PAYMENT_START_SESSION_SUCCESS.value,
                    sessionToken: myRes.value.sessionToken,
                    idPayment: myRes.value.idPayment,
                    email: myRes?.value?.user?.email,
                  });
                } else {
                  track(PAYMENT_START_SESSION_RESP_ERR.value, {
                    EVENT_ID: PAYMENT_START_SESSION_RESP_ERR.value,
                    code: myRes?.value.code,
                    message: myRes?.value.message,
                  });
                }
                return myRes.status === 200
                  ? fromNullable(myRes.value.sessionToken).getOrElse('fakeSessionToken')
                  : 'fakeSessionToken';
              },
            );
            sessionStorage.setItem('sessionToken', sessionToken);
            return sessionToken;
          },
        )
        .run();

      track(PAYMENT_APPROVE_TERMS_INIT.value, {
        EVENT_ID: PAYMENT_APPROVE_TERMS_INIT.value,
        idPayment: checkData.idPayment,
      });
      // 2. Approve Terms
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
        e => {
          // TODO: #RENDERING_ERROR
          track(PAYMENT_APPROVE_TERMS_NET_ERR.value, { EVENT_ID: PAYMENT_APPROVE_TERMS_NET_ERR.value, e });
          return toError;
        },
      )
        .fold(
          r => {
            // TODO: #RENDERING_ERROR
            track(PAYMENT_APPROVE_TERMS_SVR_ERR.value, { EVENT_ID: PAYMENT_APPROVE_TERMS_SVR_ERR.value, r });
          }, // to be replaced with logic to handle failures
          myResExt => {
            const approvalState = myResExt.fold(
              () => 'noApproval',
              myRes => {
                if (myRes.status === 200) {
                  track(PAYMENT_APPROVE_TERMS_SUCCESS.value, {
                    EVENT_ID: PAYMENT_APPROVE_TERMS_SUCCESS.value,
                    acceptTerms: myRes?.value?.data?.acceptTerms,
                    email: myRes?.value?.data?.email,
                    idPayment: fromNullable(checkData.idPayment).getOrElse(''),
                  });
                } else {
                  track(PAYMENT_APPROVE_TERMS_RESP_ERR.value, {
                    EVENT_ID: PAYMENT_APPROVE_TERMS_RESP_ERR.value,
                    code: myRes?.value?.code,
                    message: myRes?.value?.message,
                  });
                }
                return myRes.status === 200 ? JSON.stringify(myRes.value.data) : 'noApproval';
              },
            );
            sessionStorage.setItem('approvalState', approvalState);
          },
        )
        .run();

      track(PAYMENT_WALLET_INIT.value, {
        EVENT_ID: PAYMENT_WALLET_INIT.value,
        idPayment: checkData.idPayment,
      });
      // 3. Wallet
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
        e => {
          // TODO: #RENDERING_ERROR
          track(PAYMENT_WALLET_NET_ERR.value, { EVENT_ID: PAYMENT_WALLET_NET_ERR.value, e });
          return toError;
        },
      )
        .fold(
          r => {
            // TODO: #RENDERING_ERROR
            track(PAYMENT_WALLET_SVR_ERR.value, { EVENT_ID: PAYMENT_WALLET_SVR_ERR.value, r });
          }, // to be replaced with logic to handle failures
          myResExt => {
            const walletResp = myResExt.fold(
              () => 'fakeCC',
              myRes => {
                // console.log(JSON.stringify(myRes.value.data));
                if (myRes.status === 200) {
                  track(PAYMENT_WALLET_SUCCESS.value, {
                    EVENT_ID: PAYMENT_WALLET_SUCCESS.value,
                    idWallet: myRes.value.data.idWallet,
                    idPayment: fromNullable(checkData.idPayment).getOrElse(''),
                    idPsp: myRes?.value?.data?.psp?.idPsp,
                  });
                } else {
                  track(PAYMENT_WALLET_RESP_ERR.value, {
                    EVENT_ID: PAYMENT_WALLET_RESP_ERR.value,
                    code: myRes?.value.code,
                    message: myRes?.value.message,
                  });
                }
                return myRes.status === 200 ? JSON.stringify(myRes.value.data) : 'fakeWallet';
              },
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
