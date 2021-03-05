import idpayguard from './js/idpayguard';
import { initHeader } from './js/header';
// FAKE JSON
import psp from './assets/json/psp.json';

document.addEventListener('DOMContentLoaded', async () => {
  // idpayguard
  idpayguard();

  // initHeader
  initHeader();

  function eventList(el: HTMLElement) {
    const pspActiveElement = document.querySelector('.windowcont__psp__item.active') as HTMLElement;
    pspActiveElement?.classList.remove('active');
    el.classList.add('active');
    documentSubmit?.removeAttribute('disabled');
  }

  const template = document.querySelector('[data-template]');
  const positionel = template?.parentNode;
  // eslint-disable-next-line functional/immutable-data
  const pspOrdered = psp.sort((a, b) => (a.commission > b.commission ? 1 : -1));
  const documentSubmit = document.querySelector('.windowcont__psp__submit');

  pspOrdered.forEach(element => {
    const clonedItem = template?.cloneNode(true);

    if (clonedItem) {
      const newEl = positionel?.appendChild(clonedItem) as HTMLElement;
      const labelEl = newEl.querySelector('.windowcont__psp__label') as HTMLElement;
      const commissionEl = newEl.querySelector('.windowcont__psp__commission span') as HTMLElement;
      const tagEl = newEl.querySelector('.windowcont__psp__tag span') as HTMLElement;
      if (labelEl) {
        // eslint-disable-next-line functional/immutable-data
        labelEl.innerText = element.label;
      }
      if (commissionEl) {
        // eslint-disable-next-line functional/immutable-data
        commissionEl.innerText = `€ ${Intl.NumberFormat('it-IT').format(element.commission)}`;
      }
      if (element?.tag && element.tag !== '' && tagEl) {
        // eslint-disable-next-line functional/immutable-data
        tagEl.innerText = element.tag;
      } else {
        tagEl.remove();
      }

      newEl.classList.add('d-block');

      newEl.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const element = e?.target as HTMLElement;
        if (element) {
          eventList(element);
        }
      });
    }

    documentSubmit?.addEventListener('click', (e: Event) => {
      e.preventDefault();
      // TO-DO CALL SERVICE
    });
  });
});
