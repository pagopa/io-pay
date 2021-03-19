export enum ErrorsType {
  CONNECTION = 'CONNECTION',
  SERVER = 'SERVER',
  GENERIC_ERROR = 'GENERIC_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  INVALID_DATA = 'INVALID_DATA',
  TIMEOUT = 'TIMEOUT',
  INVALID_CARD = 'INVALID_CARD',
  CANCELLED_BY_USER = 'CANCELLED_BY_USER',
  EXCESSIVE_AMOUNT = 'EXCESSIVE_AMOUNT',
}

interface Error {
  img: string;
  title: string;
  desc: string;
}

type ErrorType = {
  [key: string]: Error;
};

const errors: ErrorType = {
  [ErrorsType.CONNECTION]: {
    img: require('/assets/icons/response-ko.svg'),
    title: 'Spiacenti, si è verificato un errore di rete',
    desc: 'Riprova tra qualche secondo',
  },
  [ErrorsType.SERVER]: {
    img: require('/assets/icons/response-ko.svg'),
    title: 'Il server ha risposto con un errore',
    desc: 'Riprova tra qualche secondo',
  },
  [ErrorsType.GENERIC_ERROR]: {
    img: require('/assets/icons/response-umbrella.svg'),
    title: 'Spiacenti, si è verificato un errore imprevisto',
    desc: 'Non è stato addebitato alcun importo',
  },
  [ErrorsType.AUTH_ERROR]: {
    img: require('/assets/icons/response-ko.svg'),
    title: 'Autorizzazione negata',
    desc:
      "La tua banca non ha autorizzato l'operazione. Controlla di aver inserito correttamente i vari codici richiesti dalla tua banca",
  },
  [ErrorsType.INVALID_DATA]: {
    img: require('/assets/icons/response-question.svg'),
    title: 'I dati della carta non risultano corretti',
    desc:
      "Controlla di aver inserito correttamente i dati della tua carta. L'intestatario deve coincidere esattamente con quanto riportato sulla carta.",
  },
  [ErrorsType.TIMEOUT]: {
    img: require('/assets/icons/response-timeout.svg'),
    title: 'Spiacenti, la sessione è scaduta',
    desc:
      "Non è stato addebitato alcun importo. Per la tua sicurezza, hai a disposizione 5 minuti per completare l'operazione.",
  },
  [ErrorsType.INVALID_CARD]: {
    img: require('/assets/icons/response-unrecognized.svg'),
    title: 'C’è un problema con la tua carta',
    desc: 'Non è stato addebitato alcun importo. Per maggiori informazioni, contatta la tua banca.',
  },
  [ErrorsType.CANCELLED_BY_USER]: {
    img: require('/assets/icons/response-unrecognized.svg'),
    title: 'L’operazione è stata annullata',
    desc: '',
  },
  [ErrorsType.EXCESSIVE_AMOUNT]: {
    img: require('/assets/icons/response-ko.svg'),
    title: 'Autorizzazione negata',
    desc: 'Probabilmente hai superato il massimale della tua carta. Verifica con la tua banca prima di riprovare.',
  },
};

export function errorHandler(type: ErrorsType): void {
  const errorhandlerEl: HTMLElement | null = document.querySelector('.errorhandler');
  const errorhandlerImg: HTMLImageElement | null = document.querySelector('.errorhandler__icon img');
  const errorhandlerTitle: HTMLElement | null = document.querySelector('.errorhandler__title');
  const errorhandlerDesc: HTMLElement | null = document.querySelector('.errorhandler__desc');
  const errorhandlerClose: HTMLElement | null = document.querySelector('.errorhandler__button');
  const errorData: Error = errors[type];

  if (!errorhandlerEl) {
    return;
  } else {
    if (errorhandlerTitle) {
      // eslint-disable-next-line functional/immutable-data
      errorhandlerTitle.innerText = errorData.title;
    }
    if (errorhandlerImg) {
      errorhandlerImg.setAttribute('src', errorData.img);
    }
    if (errorhandlerDesc) {
      // eslint-disable-next-line functional/immutable-data
      errorhandlerDesc.innerText = errorData.desc;
    }

    errorhandlerEl.classList.add('d-block');
    document.body.classList.add('error');
  }

  if (errorhandlerClose) {
    errorhandlerClose.addEventListener('click', (evt: Event) => {
      evt.preventDefault();
      errorhandlerEl.classList.remove('d-block');
      document.body.classList.remove('error');
    });
  }
}
