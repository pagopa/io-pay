import { Millisecond } from 'italia-ts-commons/lib/units';
import Tingle from 'tingle.js';
import * as TE from 'fp-ts/lib/TaskEither';
import * as PmClient from '../../generated/definitions/pagopa/client';
import { getConfigOrThrow } from '../utils/config';
import { retryingFetch } from '../utils/fetch';
import {
  mixpanel,
  PAYMENT_ACTION_DELETE_INIT,
  PAYMENT_ACTION_DELETE_NET_ERR,
  PAYMENT_ACTION_DELETE_RESP_ERR,
  PAYMENT_ACTION_DELETE_SUCCESS,
  PAYMENT_ACTION_DELETE_SVR_ERR,
} from '../utils/mixpanelHelperInit';
import { errorHandler, ErrorsType } from './errorhandler';

const pmClient: PmClient.Client = PmClient.createClient({
  baseUrl: getConfigOrThrow().IO_PAY_PAYMENT_MANAGER_HOST,
  fetchApi: retryingFetch(fetch, 2000 as Millisecond, 3),
});

const modalWindows = () => {
  const modalCallers = document.querySelectorAll('[data-modal]');
  const modals: Record<string, any> = {};

  const createModal = (elfrom: any) => {
    const modalTarget = document.querySelector(elfrom.getAttribute('data-modal'));
    const buttons = elfrom.getAttribute('data-modal-buttons') || null;
    if (modalTarget == null) {
      return false;
    }
    const modalName = modalTarget.getAttribute('name');
    const modalCss = elfrom.getAttribute('data-modal-css') || 'normal';

    // eslint-disable-next-line functional/immutable-data
    modals[modalName] = new Tingle.modal({
      footer: true,
      closeLabel: 'Chiudi',
      cssClass: modalCss.split(' '),
      closeMethods: ['button'],
      onOpen: () => {
        const modalContent = modals[modalName].modalBox;
        modalContent.setAttribute('tab-index', '-1');
        modalContent.setAttribute('aria-live', 'polite');
        modalContent.focus();
        const customClose = modalContent.querySelector('.modalwindow__close');
        if (customClose !== null) {
          customClose.addEventListener('click', () => {
            modals[modalName].close();
          });
        }
      },
    });

    const modalContent = modalTarget || null;

    modals[modalName].setContent(modalContent.innerHTML);

    if (buttons !== null) {
      const buttonsArray = buttons.split(',');

      if (buttonsArray.indexOf('cancel') >= 0) {
        modals[modalName].addFooterBtn('Annulla il pagamento', 'btn btn-primary w-100 mb-2', async function () {
          await paymentCancelHandler();
        });
      }
      if (buttonsArray.indexOf('close') >= 0) {
        modals[modalName].addFooterBtn('Chiudi', 'btn btn-outline-primary w-100', function () {
          modals[modalName].close();
        });
      }
    }

    return modalName;
  };

  modalCallers.forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const modalWindow = createModal(el);
      modals[modalWindow].open();
    });
  });
};

const paymentCancelHandler = async () => {
  const checkData = JSON.parse(sessionStorage.getItem('checkData') || '');

  // Payment action DELETE
  mixpanel.track(PAYMENT_ACTION_DELETE_INIT.value, {
    EVENT_ID: PAYMENT_ACTION_DELETE_INIT.value,
    idPayment: checkData.idPayment,
  });

  const eventResult:
    | PAYMENT_ACTION_DELETE_NET_ERR
    | PAYMENT_ACTION_DELETE_SVR_ERR
    | PAYMENT_ACTION_DELETE_RESP_ERR
    | PAYMENT_ACTION_DELETE_SUCCESS = await TE.tryCatch(
    () =>
      pmClient.deleteBySessionCookieExpiredUsingDELETE({
        Bearer: `Bearer ${sessionStorage.getItem('sessionToken')}`,
        id: checkData.idPayment,
        koReason: 'ANNUTE',
        showWallet: false,
      }),
    () => PAYMENT_ACTION_DELETE_NET_ERR.value,
  )
    .fold(
      () => PAYMENT_ACTION_DELETE_SVR_ERR.value,
      myResExt =>
        myResExt.fold(
          () => PAYMENT_ACTION_DELETE_RESP_ERR.value,
          myRes => (myRes.status === 200 ? PAYMENT_ACTION_DELETE_SUCCESS.value : PAYMENT_ACTION_DELETE_RESP_ERR.value),
        ),
    )
    .run();

  mixpanel.track(eventResult, { EVENT_ID: eventResult, idPayment: checkData.idPayment });

  if (PAYMENT_ACTION_DELETE_SUCCESS.decode(eventResult).isRight()) {
    location.replace('cancelled.html');
  } else if (PAYMENT_ACTION_DELETE_NET_ERR.decode(eventResult).isRight()) {
    errorHandler(ErrorsType.CONNECTION);
  } else if (PAYMENT_ACTION_DELETE_SVR_ERR.decode(eventResult).isRight()) {
    errorHandler(ErrorsType.SERVER);
  } else {
    errorHandler(ErrorsType.GENERIC_ERROR);
  }
};

export { modalWindows };
