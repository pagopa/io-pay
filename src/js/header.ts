export function initHeader() {
  const enteBeneficiario: HTMLElement | null = document.querySelector("[data-sessiondata='enteBeneficiario']");
  const subject: HTMLElement | null = document.querySelector("[data-sessiondata='subject']");
  const importo: HTMLElement | null = document.querySelector("[data-sessiondata='importo']");
  const dataStored: string | null = sessionStorage.getItem('checkData');
  const data = dataStored ? JSON.parse(dataStored) : null;

  if (enteBeneficiario) {
    // eslint-disable-next-line functional/immutable-data
    enteBeneficiario.innerText = data?.detailsList[0].enteBeneficiario;
  }
  if (subject) {
    // eslint-disable-next-line functional/immutable-data
    subject.innerText = data?.subject;
  }
  if (importo) {
    const prettifiedAmount = parseInt(data?.amount.amount.toString(), 10) / 100;
    // eslint-disable-next-line functional/immutable-data
    importo.innerText = prettifiedAmount ? `€ ${Intl.NumberFormat('it-IT').format(prettifiedAmount)}` : '';
  }
}
