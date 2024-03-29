import { actionsCheck } from './js/sessiondata';
import { initHeader } from './js/header';
import idpayguard from './js/idpayguard';
import { initDropdowns } from './js/dropdowns';

// eslint-disable-next-line sonarjs/cognitive-complexity
document.addEventListener('DOMContentLoaded', async () => {
  const useremail: HTMLInputElement | null = (document.getElementById('useremail') as HTMLInputElement) || null;
  const useremailCheck: HTMLInputElement | null =
    (document.getElementById('useremailCheck') as HTMLInputElement) || null;
  const emailform: HTMLElement | null = document.getElementById('emailform') || null;
  const emailformInputs: NodeListOf<HTMLInputElement> | undefined = emailform?.querySelectorAll('input');
  const emailformSubmit: HTMLElement | null = emailform?.querySelector("button[type='submit']") || null;

  // actions/check FAKE IMPLEMENTATION
  await actionsCheck();

  initHeader();

  initDropdowns();

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
      emailformSubmit?.setAttribute('disabled', '1'); // FIXME: type should be bool
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
    if (inputel.value === useremailCheck.value && emailValidation(useremailCheck.value)) {
      toggleValid(useremailCheck, true);
    } else if (useremailCheck.value.length > 0) {
      toggleValid(useremailCheck, false);
    }

    fieldsCheck();
  });
  // Event to check the second e-mail field
  useremailCheck?.addEventListener('keyup', function () {
    const inputel: HTMLInputElement = this as HTMLInputElement;

    if (inputel.value === useremail.value && emailValidation(useremail.value)) {
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
      // eslint-disable-next-line functional/immutable-data
      window.location.href = 'inputcard.html';
    } else {
      emailformSubmit?.setAttribute('disabled', 'disabled');
    }
  });

  // If there is a value in sessionStorage
  if (sessionStorage.getItem('useremail') !== null) {
    // eslint-disable-next-line functional/immutable-data
    useremail.value = sessionStorage.getItem('useremail') || '';
    // eslint-disable-next-line functional/immutable-data
    useremailCheck.value = sessionStorage.getItem('useremail') || '';
    toggleValid(useremail, true);
    toggleValid(useremailCheck, true);
    fieldsCheck();
  }
});
