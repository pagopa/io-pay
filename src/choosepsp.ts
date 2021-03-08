import * as TE from 'fp-ts/lib/TaskEither';
import { Millisecond } from 'italia-ts-commons/lib/units';
import { toError } from 'fp-ts/lib/Either';
import { createClient } from '../generated/definitions/pagopa/client';
import { retryingFetch } from './utils/fetch';
import idpayguard from './js/idpayguard';
import { initHeader } from './js/header';
import { modalWindows } from './js/modals';

const pmClient = createClient({
  baseUrl: 'http://localhost:8080',
  fetchApi: retryingFetch(fetch, 2000 as Millisecond, 3),
});

document.addEventListener('DOMContentLoaded', async () => {
  // idpayguard
  idpayguard();

  // initHeader
  initHeader();

  // init modals
  modalWindows();

  const walletStored = sessionStorage.getItem('wallet') || '';
  const checkDataStored = sessionStorage.getItem('checkData') || '';
  const sessionToken = sessionStorage.getItem('sessionToken') || '';

  const checkData = JSON.parse(checkDataStored);
  const wallet = JSON.parse(walletStored);

  const idPayment = checkData.idPayment;
  const Bearer = `Bearer ${sessionToken}`;
  const paymentType = wallet.type;
  const isList = true;
  const language = 'it';
  const idWallet = wallet.idWallet;

  const psp = await TE.tryCatch(
    () =>
      pmClient.getPspListUsingGET({
        Bearer,
        paymentType,
        isList,
        idWallet,
        language,
        idPayment,
      }),
    toError,
  )
    .fold(
      () => [], // to be replaced with logic to handle failures
      myResExt =>
        myResExt
          .fold(
            () => [],
            myRes => (myRes.status === 200 ? myRes.value.data?.pspList : []),
          )
          .map(e => ({
            name: e?.businessName,
            label: e?.businessName,
            image: e?.logoPSP,
            commission:
              e?.fixedCost?.amount && e?.fixedCost?.decimalDigits
                ? e?.fixedCost?.amount / Math.pow(10, e?.fixedCost?.decimalDigits)
                : 0,
          })),
    )
    .run();

  function eventList(el: HTMLElement) {
    const pspActiveElement = document.querySelector('.windowcont__psp__item.active') as HTMLElement;
    pspActiveElement?.classList.remove('active');
    el.classList.add('active');
    documentSubmit?.removeAttribute('disabled');
  }

  const template = document.querySelector('[data-template]');
  const positionel = template?.parentNode;
  // eslint-disable-next-line functional/immutable-data
  const pspOrdered = psp ? psp.sort((a, b) => (a.commission > b.commission ? 1 : -1)) : [];
  const documentSubmit = document.querySelector('.windowcont__psp__submit');

  pspOrdered.forEach(element => {
    const clonedItem = template?.cloneNode(true);

    if (clonedItem) {
      const newEl = positionel?.appendChild(clonedItem) as HTMLElement;
      const labelEl = newEl.querySelector('.windowcont__psp__label') as HTMLElement;
      const commissionEl = newEl.querySelector('.windowcont__psp__commission span') as HTMLElement;
      if (labelEl) {
        // eslint-disable-next-line functional/immutable-data
        labelEl.innerText = element.label || '';
      }
      if (commissionEl) {
        // eslint-disable-next-line functional/immutable-data
        commissionEl.innerText = `€ ${Intl.NumberFormat('it-IT').format(element.commission)}`;
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
      // TO-DO CALL SERVICE WITH PUT METHOD
    });
  });
});
