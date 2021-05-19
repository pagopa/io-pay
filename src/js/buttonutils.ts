/* Function tipically used to set disabled the main CTA waiting for a response */
export function buttonDisabler(btn: HTMLButtonElement, text: string = 'Caricamento...'): void {
  btn.setAttribute('disabled', 'disabled');
  btn.setAttribute('data-originaltext', btn.innerText);
  // eslint-disable-next-line functional/immutable-data
  btn.innerText = text;
}

/* Function tipically used to back to the main CTA action button */
export function buttonEnabler(btn: HTMLButtonElement): void {
  btn.removeAttribute('disabled');
  // eslint-disable-next-line functional/immutable-data
  btn.innerText = btn.getAttribute('data-originaltext') || 'Continua';
}
