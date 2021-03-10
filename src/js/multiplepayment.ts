export function initMultiplePayment(data) {
  document.body.classList.add('multiplePayment');
  const template = document.querySelector('[data-template="mpitem"]');
  const positionel = template?.parentNode;

  // eslint-disable-next-line sonarjs/cognitive-complexity
  data.detailsList.forEach(async payment => {
    const clonedItem = template?.cloneNode(true);
    const openWindow = document.getElementById('openMultiplePaymentWindow');
    const multiplePaymentWindow = document.getElementById('multiplePaymentWindow');
    const closeMultiplePaymentWindow = document.getElementsByClassName('mpmodal__close');

    openWindow?.addEventListener('click', (e: Event) => {
      e.preventDefault();
      multiplePaymentWindow?.classList.add('show');
    });
    Array.from(closeMultiplePaymentWindow).forEach(element => {
      (element as HTMLElement).addEventListener('click', (e: Event) => {
        e.preventDefault();
        multiplePaymentWindow?.classList.remove('show');
      });
    });

    if (clonedItem) {
      const newEl = positionel?.appendChild(clonedItem) as HTMLElement;
      const itemTitle = newEl.querySelector('.mpmodal__item__title') as HTMLElement;
      const itemAmount = newEl.querySelector('.mpmodal__item__amount') as HTMLElement;
      const itemName = newEl.querySelector('.mpmodal__item__name') as HTMLElement;
      const itemFc = newEl.querySelector('.mpmodal__item__fc') as HTMLElement;
      const itemTot = newEl.querySelector('.mpmodal__item__tot') as HTMLElement;
      const itemIuv = newEl.querySelector('.mpmodal__item__iuv') as HTMLElement;
      const itemHeader = newEl.querySelector('.mpmodal__item__header') as HTMLElement;
      const amount: number = payment.importo ? payment.importo : 0;

      if (payment.enteBeneficiario && itemTitle) {
        // eslint-disable-next-line functional/immutable-data
        itemTitle.innerText = payment.enteBeneficiario;
      }
      if (payment.importo && itemAmount) {
        // eslint-disable-next-line functional/immutable-data
        itemAmount.innerText = `€ ${Intl.NumberFormat('it-IT').format(+(amount || '0'))}`;
      }
      if (payment.nomePagatore && itemName) {
        // eslint-disable-next-line functional/immutable-data
        itemName.innerText = payment.nomePagatore;
      }
      if (payment.codicePagatore && itemFc) {
        // eslint-disable-next-line functional/immutable-data
        itemFc.innerText = payment.codicePagatore;
      }
      if (payment.importo && itemTot) {
        // eslint-disable-next-line functional/immutable-data
        itemTot.innerText = `€ ${Intl.NumberFormat('it-IT').format(+(amount || '0'))}`;
      }
      if (payment.IUV && itemIuv) {
        // eslint-disable-next-line functional/immutable-data
        itemIuv.innerText = payment.IUV;
      }
      newEl.classList.add('d-block');

      itemHeader.addEventListener('click', (e: Event) => {
        e.preventDefault();
        const target = e?.target as HTMLElement;
        target.classList.toggle('expanded');
      });
    }
  });
}
