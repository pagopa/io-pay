import * as TE from 'fp-ts/lib/TaskEither';
import { Millisecond } from 'italia-ts-commons/lib/units';
import { toError } from 'fp-ts/lib/Either';
import { fromNullable } from 'fp-ts/lib/Option';
import { createClient } from '../generated/definitions/pagopa/client';
import { WalletResponse } from '../generated/definitions/pagopa/WalletResponse';
import { retryingFetch } from './utils/fetch';
import idpayguard from './js/idpayguard';
import { initHeader } from './js/header';
import { modalWindows } from './js/modals';
import { getConfigOrThrow } from './utils/config';

const pmClient = createClient({
  baseUrl: getConfigOrThrow().IO_PAY_PAYMENT_MANAGER_HOST,
  fetchApi: retryingFetch(fetch, 2000 as Millisecond, 3),
});

// eslint-disable-next-line sonarjs/cognitive-complexity
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

  const pspL = await TE.tryCatch(
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
      () => undefined, // to be replaced with logic to handle failures
      myResExt =>
        myResExt.fold(
          () => [],
          myRes => (myRes?.status === 200 ? myRes?.value?.data?.pspList : []),
        ),
    )
    .run();

  const psp = pspL?.map(e => ({
    name: e?.businessName,
    label: e?.businessName,
    image: e?.logoPSP,
    commission:
      e?.fixedCost?.amount && e?.fixedCost?.decimalDigits
        ? e?.fixedCost?.amount / Math.pow(10, e?.fixedCost?.decimalDigits)
        : 0,
    idPsp: e?.id,
  }));

  function eventList(el: HTMLElement) {
    const pspActiveElement = document.querySelector('.windowcont__psp__item.active') as HTMLElement;
    pspActiveElement?.classList.remove('active');
    el.classList.add('active');
    documentSubmit?.removeAttribute('disabled');
  }

  const template = document.querySelector('[data-template="pspitem"]');
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
      const logoEl = newEl.querySelector('.windowcont__psp__logo') as HTMLImageElement;
      if (labelEl) {
        // eslint-disable-next-line functional/immutable-data
        labelEl.innerText = element.label || '';
      }
      if (commissionEl) {
        // eslint-disable-next-line functional/immutable-data
        commissionEl.innerText = `€ ${Intl.NumberFormat('it-IT').format(element.commission)}`;
      }
      if (logoEl && element.image) {
        logoEl.setAttribute('src', element.image);
      } else {
        logoEl.remove();
      }

      newEl.setAttribute('idpsp', fromNullable(element.idPsp).getOrElse(-1).toString());

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
  });
  documentSubmit?.addEventListener(
    'click',
    async (e: Event) => {
      e.preventDefault();
      const idPsp = document.querySelector('.windowcont__psp__list .active') as HTMLElement;
      // update Wallet
      await TE.tryCatch(
        () =>
          pmClient.updateWalletUsingPUT({
            Bearer,
            id: idWallet,
            walletRequest: {
              data: {
                // eslint-disable-next-line radix
                idPsp: parseInt(fromNullable(idPsp.getAttribute('idpsp')).getOrElse('-1')), // Just set the ID of the new PSP
              },
            },
          }),
        toError,
      )
        .fold(
          () => undefined, // to be replaced with logic to handle failures
          myResExt =>
            myResExt.fold(
              () => undefined,
              res => {
                const updateWalletRsp = WalletResponse.decode(res.value).getOrElse({ data: {} });
                sessionStorage.setItem('wallet', JSON.stringify(updateWalletRsp.data));
                window.location.replace('check.html');
              },
            ),
        )
        .run();
    },
    true,
  );
});
