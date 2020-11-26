import Tingle from 'tingle.js';
import { getUrlParameter } from './js/urlUtilities';
import { setTranslateBtns } from './js/translateui';
import { userSession } from './js/sessiondata';
import { modalWindows, getModals } from './js/modals';

const CreditCard = require('card-validator');

document.addEventListener('DOMContentLoaded', function () {
    userSession();

    // init modals
    modalWindows();

    const circuitCustomType = document.querySelector('.windowcont__recapcc__circuit--custom use');
    const circuitCustomEl = document.querySelector('.windowcont__recapcc__circuit--custom');
    const circuitDefaultEl = document.querySelector('.windowcont__recapcc__circuit');
    const circuitCustomTypeHref = circuitCustomType?.getAttribute('href');

    const checkTotamount = document.getElementById('check__totamount');
    const checkTotamountButton = document.getElementById('check__totamount__button');
    const checkCreditcardname = document.getElementById('check__creditcardname');
    const checkCreditcardexpirationdate = document.getElementById('check__creditcardexpirationdate');
    const checkCreditcardnumber = document.getElementById('check__creditcardnumber');

    const amount = sessionStorage.getItem('amount');
    const creditcardname = sessionStorage.getItem('creditcardname');
    const creditcardexpirationdate = sessionStorage.getItem('creditcardexpirationdate');
    const creditcardnumber = sessionStorage.getItem('creditcardnumber');

    const creditcardcircuitValidator = CreditCard.number(creditcardnumber);
    const creditcardcircuit =
        creditcardcircuitValidator.card !== null ? creditcardcircuitValidator.card.type.toLowerCase() : null;
    if (creditcardcircuit !== null) {
        circuitCustomEl?.classList.remove('d-none');
        circuitDefaultEl?.classList.add('d-none');
        const circuitCustomUrl = circuitCustomTypeHref?.replace('#icons-visa', `#icons-${creditcardcircuit}`);
        circuitCustomType?.setAttribute('href', circuitCustomUrl);
    }

    const creditcardnumberMasked = creditcardnumber.slice(creditcardnumber.length - 3, creditcardnumber.length);

    checkTotamount.innerText = `€ ${Intl.NumberFormat('it-IT').format(amount)}`;
    checkTotamountButton.innerText = `€ ${Intl.NumberFormat('it-IT').format(amount)}`;
    checkCreditcardname.innerText = creditcardname;
    checkCreditcardexpirationdate.innerText = creditcardexpirationdate;
    checkCreditcardnumber.innerText = '****' + creditcardnumberMasked;
});
