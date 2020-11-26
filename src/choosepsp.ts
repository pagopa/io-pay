import Tingle from 'tingle.js';
import { setTranslateBtns } from './js/translateui';
import { userSession } from './js/sessiondata';
import { modalWindows, getModals } from './js/modals';

import psp from './assets/json/psp.json';

document.addEventListener('DOMContentLoaded', function () {
    userSession();

    // init modals
    modalWindows();

    function eventList(el) {
        positionel?.querySelector('.active')?.classList.remove('active');
        el.classList.add('active');
        documentSubmit?.removeAttribute('disabled');
    }

    const template = document.querySelector('[data-template]');
    const positionel = template?.parentNode;
    const pspOrdered = psp.sort((a, b) => (a.commission > b.commission ? 1 : -1));
    const documentSubmit = document.querySelector('.windowcont__psp__submit');

    pspOrdered.forEach(element => {
        const clonedItem = template.cloneNode(true);

        clonedItem.querySelector('.windowcont__psp__label').innerText = element.label;
        clonedItem.querySelector('.windowcont__psp__commission span').innerText = `€ ${Intl.NumberFormat(
            'it-IT',
        ).format(element.commission)}`;

        if (element?.tag && element.tag != '') {
            clonedItem.querySelector('.windowcont__psp__tag span').innerText = element.tag;
        } else {
            clonedItem.querySelector('.windowcont__psp__tag span').remove();
        }

        clonedItem.classList.add('d-block');

        clonedItem.addEventListener('click', function (e) {
            e.preventDefault();
            eventList(this);
        });

        positionel?.appendChild(clonedItem);
    });
});
