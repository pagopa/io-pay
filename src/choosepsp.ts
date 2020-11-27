import { userSession } from './js/sessiondata';
import { modalWindows } from './js/modals';

import psp from './assets/json/psp.json';

document.addEventListener('DOMContentLoaded', () => {
  userSession();

  // init modals
  modalWindows();

  const eventList = (el: any) => {
    positionel?.querySelector('.active')?.classList.remove('active');
    el.classList.add('active');
    documentSubmit?.removeAttribute('disabled');
  };

  const template = document.querySelector('[data-template]');
  const positionel = template?.parentNode;
  // eslint-disable-next-line functional/immutable-data
  const pspOrdered = psp.sort((a, b) => (a.commission > b.commission ? 1 : -1));
  const documentSubmit = document.querySelector('.windowcont__psp__submit');

  pspOrdered.forEach(element => {
    const clonedItem = template?.cloneNode(true);

    // clonedItem.querySelector('.windowcont__psp__label').innerText = element.label;
    clonedItem?.parentElement?.querySelector('.windowcont__psp__label')?.setAttribute('innerText', element.label);

    // clonedItem.querySelector('.windowcont__psp__commission span').innerText = `€ ${Intl.NumberFormat(
    //    'it-IT',
    // ).format(element.commission)}`;

    clonedItem?.parentElement
      ?.querySelector('.windowcont__psp__commission span')
      ?.setAttribute('innerText', `€ ${Intl.NumberFormat('it-IT').format(element.commission)}`);

    if (element?.tag && element.tag !== '') {
      // clonedItem.querySelector('.windowcont__psp__tag span').innerText = element.tag;
      clonedItem?.parentElement?.querySelector('.windowcont__psp__tag span')?.setAttribute('innerText', element.tag);
    } else {
      clonedItem?.parentElement?.querySelector('.windowcont__psp__tag span')?.remove();
    }

    clonedItem?.parentElement?.classList.add('d-block');

    clonedItem?.addEventListener('click', e => {
      e.preventDefault();
      // eventList(this); ???
      eventList(e);
    });

    if (clonedItem) {
      positionel?.appendChild(clonedItem);
    }
  });
});
