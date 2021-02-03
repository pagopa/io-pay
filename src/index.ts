import { createClient } from '../generated/definitions/pagopa/client';
import { userSession } from './js/sessiondata';

// eslint-disable-next-line sonarjs/cognitive-complexity
document.addEventListener('DOMContentLoaded', () => {
  const pmClient = createClient({
    baseUrl: 'http://localhost:8080',
    fetchApi: fetch,
  });

  const useremail = document.getElementById('useremail') || null;
  const emailform = document.getElementById('emailform') || null;
  const emailformInputs = emailform ? emailform.querySelectorAll('input') : null;
  const emailformSubmit = emailform?.querySelectorAll("button[type='submit']")
    ? emailform.querySelectorAll("button[type='submit']")[0]
    : null;

  // userSession FAKE IMPLEMENTATION
  userSession();

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

  // check if all fields are OK
  function fieldsCheck() {
    const checkedFields = emailform?.querySelectorAll('input[data-checked]');
    if (checkedFields?.length === emailformInputs?.length) {
      emailformSubmit?.removeAttribute('disabled');
    } else {
      emailformSubmit?.setAttribute('disabled', '1'); // TODO: type should be bool
    }
  }
  useremail?.addEventListener('keyup', function () {
    const inputel: HTMLInputElement = this as HTMLInputElement;
    // eslint-disable-next-line
    const regpattern = new RegExp(/^(("[\w-\s]+")|([\w-]+(?:\.[\w-]+)*)|("[\w-\s]+")([\w-]+(?:\.[\w-]+)*))(@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][0-9]\.|1[0-9]{2}\.|[0-9]{1,2}\.))((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){2}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\]?$)/i);

    if (regpattern.test(inputel.value) === true) {
      toggleValid(inputel, true);
    } else {
      toggleValid(inputel, false);
    }
    fieldsCheck();
  });
});
