import { getUrlParameter } from './js/urlUtilities';
import { setTranslateBtns } from './js/translateui';
import { modalWindows } from './js/modals';
import { userSession } from './js/sessiondata';

const CreditCard = require('card-validator');

document.addEventListener('DOMContentLoaded', function () {
    const paymentID = getUrlParameter('p');

    const dropdownElements = document.querySelectorAll('.btn-dropdown');

    const privacyToggler = document.getElementById('privacyToggler') || null;
    const privacyTogglerInput = document.getElementById('privacyTogglerInput') || null;
    const obscureToggler = document.querySelectorAll('.obscureToggler') || null;
    const creditcardform = document.getElementById('creditcardform') || null;
    const creditcardformName = document.getElementById('creditcardname') || null;
    const creditcardformInputs = creditcardform ? creditcardform.querySelectorAll('input') : null;
    const creditcardformSubmit = creditcardform.querySelectorAll("button[type='submit']")
        ? creditcardform.querySelectorAll("button[type='submit']")[0]
        : null;
    const creditcardformNumber = document.getElementById('creditcardnumber') || null;
    const creditcardformHolderIcon = document.getElementById('creditcardholdericon') || null;
    const creditcardformExpiration = document.getElementById('creditcardexpirationdate') || null;
    const creditcardformSecurecode = document.getElementById('creditcardsecurcode') || null;

    // check if all fields are OK
    function fieldsCheck() {
        const checkedFields = creditcardform.querySelectorAll('input[data-checked]');

        if (checkedFields.length == creditcardformInputs.length) {
            creditcardformSubmit.removeAttribute('disabled');
        } else {
            creditcardformSubmit.setAttribute('disabled', 1);
        }
    }

    // Add / remove validity to input elements
    function toggleValid(el, isItValid) {
        if (isItValid == true) {
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

    function fillFieldsBySessionStorage() {
        Object.keys(window.sessionStorage).map(function (k) {
            const fillValue = window.sessionStorage.getItem(k);
            const el = document.querySelector(`[name="${k}"]`) || null;
            if (el !== null) {
                el.value = fillValue;
                el.setAttribute('data-checked', 1);
                if (el.getAttribute('type') == 'checkbox') {
                    el.setAttribute('checked', 1);
                }
            }
        });
        fieldsCheck();
    }

    // init translations
    setTranslateBtns();

    // userSession FAKE IMPLEMENTATION
    userSession();

    // init modals
    modalWindows();

    fillFieldsBySessionStorage();

    // dropdown
    dropdownElements.forEach(el => {
        el.addEventListener('click', function () {
            const parentEl = el.parentNode;
            const opened = el.getAttribute('aria-expanded') == 'true';
            const target = el.getAttribute('data-target') || null;
            if (target == null) {
                return;
            }
            const targetEl = document.getElementById(target);
            targetEl.addEventListener('click', function () {
                document.body.classList.remove('dropdown-opened');
                document.body.removeAttribute('data-dropdownopened');
                el.setAttribute('aria-expanded', 'false');
                parentEl.classList.remove('show');
                targetEl.classList.remove('show');
            });

            if (opened == true) {
                document.body.classList.remove('dropdown-opened');
                document.body.removeAttribute('data-dropdownopened');
                el.setAttribute('aria-expanded', 'false');
                parentEl.classList.remove('show');
                targetEl.classList.remove('show');
            } else {
                document.body.classList.add('dropdown-opened');
                document.body.setAttribute('data-dropdownopened', target);
                el.setAttribute('aria-expanded', 'true');
                parentEl.classList.add('show');
                targetEl.classList.add('show');
            }
        });
    });

    privacyToggler?.addEventListener('click', function () {
        if (privacyTogglerInput == null) {
            return;
        }

        if (privacyTogglerInput.hasAttribute('checked') == true) {
            privacyTogglerInput.removeAttribute('checked');
            privacyTogglerInput.removeAttribute('data-checked');
        } else {
            privacyTogglerInput.setAttribute('checked', 1);
            privacyTogglerInput.setAttribute('data-checked', 1);
        }
        fieldsCheck();
    });

    obscureToggler.forEach(el => {
        el.addEventListener('click', function () {
            const toggler = this;
            const target = toggler.getAttribute('data-obscuretarget') || null;
            if (target == null) {
                return;
            }
            const targetInput = document.getElementById(target);

            if (targetInput.getAttribute('type') == 'text') {
                targetInput.setAttribute('type', 'password');
                toggler.setAttribute('data-obscured', 1);
            } else {
                targetInput.setAttribute('type', 'text');
                toggler.removeAttribute('data-obscured');
            }
        });
    });

    creditcardformSubmit.addEventListener('click', function (e) {
        e.preventDefault();

        creditcardformInputs.forEach(el => {
            sessionStorage.setItem(el.getAttribute('name').trim(), el.value);
        });
        window.location.replace('check.html');
    });

    // VALIDATIONS --------------------------
    // Name Surname (at least two words)
    creditcardformName.addEventListener('keyup', function () {
        const inputel = this;
        // var stringpattern = "(\\w.+\\s).+";
        const stringpattern = "^[A-Za-zÀ-ÖØ-öø-ÿ 'w -]+$";

        const regpatternCharacther = new RegExp("^[A-Za-zÀ-ÖØ-öø-ÿ 'w -].{1,42}$", 'i');
        const regpatternAtLeastOneSpace = new RegExp('(\\w.+\\s).+', 'i');

        regpatternCharacther.test(inputel.value) == true && regpatternAtLeastOneSpace.test(inputel.value)
            ? toggleValid(inputel, true)
            : toggleValid(inputel, false);
        fieldsCheck();
    });

    // Creditcard specific
    creditcardformNumber.addEventListener('keyup', function () {
        const inputel = this;
        let holder = null;
        const ccelems = creditcardformHolderIcon.getElementsByClassName('.ccicon--custom');
        const creditCardValidation = CreditCard.number(inputel.value);

        ccelems.length > 0 &&
            Array.from(ccelems).forEach(element => {
                element.classList.remove('d-block');
            });

        if (creditCardValidation.isValid == true) {
            toggleValid(inputel, true);
            holder = creditCardValidation.card.type.toLowerCase();

            const ccelem = creditcardformHolderIcon.getElementsByClassName(holder);
            ccelem.length > 0 && ccelem[0].classList.add('d-block');
        } else {
            toggleValid(inputel, false);
            holder = null;
        }
        fieldsCheck();
    });

    creditcardformExpiration.addEventListener('keyup', function () {
        const inputel = this;

        const dateValidation = CreditCard.expirationDate(inputel.value);

        if (dateValidation.isValid == true) {
            toggleValid(inputel, true);
        } else {
            toggleValid(inputel, false);
        }

        fieldsCheck();
    });

    creditcardformSecurecode.addEventListener('keyup', function () {
        const inputel = this;
        const creditCardValidation = CreditCard.number(creditcardformNumber.value);
        const cvvSize = creditCardValidation.card !== null ? creditCardValidation.card.code.size : 3;

        const cvvValidation = CreditCard.cvv(inputel.value, cvvSize);

        if (cvvValidation.isValid == true) {
            toggleValid(inputel, true);
        } else {
            toggleValid(inputel, false);
        }
        fieldsCheck();
    });
});
