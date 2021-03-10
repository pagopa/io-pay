import Tingle from 'tingle.js';

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
      cssClass: modalCss.split(' '),
      closeMethods: ['button'],
      onOpen: () => {
        const customClose = modals[modalName].modalBox.querySelector('.modalwindow__close');
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
        modals[modalName].addFooterBtn('Annulla', 'btn btn-primary w-100 mb-2', function () {
          alert('Annulla sessione');
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

export { modalWindows };
