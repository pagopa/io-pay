// import mixpanel from 'mixpanel-browser';

// eslint-disable-next-line sonarjs/cognitive-complexity
export function initHeader() {
  const enteBeneficiario = document.querySelectorAll("[data-sessiondata='enteBeneficiario']") || null;
  const subject = document.querySelectorAll("[data-sessiondata='subject']") || null;
  const importo = document.querySelectorAll("[data-sessiondata='importo']") || null;
  const dataStored: string | null = sessionStorage.getItem('checkData');
  const data = dataStored ? JSON.parse(dataStored) : null;

  // // ini MIX
  // mixpanel.init('c3db8f517102d7a7ebd670c9da3e05c4', {
  //   api_host: 'https://api-eu.mixpanel.com',
  // }); // secret

  // mixpanel.track(`io-pay-blablabla`, { genre: 'hip-hop', 'duration in seconds': 42 });

  if (enteBeneficiario) {
    for (const el of Array.from(enteBeneficiario)) {
      // eslint-disable-next-line functional/immutable-data
      (el as HTMLElement).innerText = data?.detailsList[0].enteBeneficiario;
    }
  }
  if (subject) {
    for (const el of Array.from(subject)) {
      // eslint-disable-next-line functional/immutable-data
      (el as HTMLElement).innerText = data?.subject;
    }
  }
  if (importo) {
    const prettifiedAmount = parseInt(data?.amount.amount.toString(), 10) / 100;
    for (const el of Array.from(importo)) {
      // eslint-disable-next-line functional/immutable-data
      (el as HTMLElement).innerText = prettifiedAmount
        ? `€ ${Intl.NumberFormat('it-IT').format(prettifiedAmount)}`
        : '';
    }
  }
}
