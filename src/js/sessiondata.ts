import userSessionData from '../assets/json/userSession.json';
import { getUrlParameter } from './urlUtilities';

export function userSession() {
    document.body.classList.add('loading');

    const paymentIDStored = sessionStorage.getItem('paymentID');
    const paymentByQS = getUrlParameter('p') != '' ? getUrlParameter('p') : null;
    const paymentID = paymentIDStored != null ? paymentIDStored : paymentByQS;
    if (paymentID == null) {
        return false;
    }

    const amountPrettified = parseInt(userSessionData.data.payment.amount.amount) / 100;
    sessionStorage.setItem('amount', amountPrettified);

    // FAKE IMPLEMENTATION
    const enteBeneficiario = document.querySelector("[data-sessiondata='enteBeneficiario']");
    const subject = document.querySelector("[data-sessiondata='subject']");
    const importo = document.querySelector("[data-sessiondata='importo']");

    const importoValue = userSessionData.data.payment.detailsList[0].importo;

    enteBeneficiario.innerText = userSessionData.data.payment.detailsList[0].enteBeneficiario;
    subject.innerText = userSessionData.data.payment.subject;
    importo.innerText = `€ ${Intl.NumberFormat('it-IT').format(importoValue)}`;

    if (paymentIDStored == null) {
        sessionStorage.setItem('paymentID', paymentID);
    }

    document.body.classList.remove('loading');
}
