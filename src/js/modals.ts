import Tingle from 'tingle.js';


function modalWindows() {
    const modalCallers = document.querySelectorAll("[data-modal]");
    var modals = {};

    function createModal(elfrom) {
        const modalTarget = document.querySelector( elfrom.getAttribute("data-modal") );
        const buttons = elfrom.getAttribute("data-modal-buttons") || null;
        if (modalTarget==null) return false;
        const modalName = modalTarget.getAttribute("name");

        modals[modalName] = new Tingle.modal({
        footer: true,
        onOpen: function() {
            const customClose = this.modalBox.querySelector(".modalwindow__close");
            if (customClose!==null) {
            customClose.addEventListener("click", function() {
                modals[modalName].close();
            })
            }
        },
        });

        let modalContent = modalTarget || null;

        modals[modalName].setContent(modalContent.innerHTML);

        if (buttons!==null) {
            const buttonsArray = buttons.split(',');

            if (buttonsArray.indexOf('cancel')>=0) {
                modals[modalName].addFooterBtn('Annulla', 'btn btn-primary w-100 mb-2', function() {
                    alert('Annulla sessione');
                });
            }
            if (buttonsArray.indexOf('close')>=0) {
                modals[modalName].addFooterBtn('Chiudi', 'btn btn-outline-primary w-100', function() {
                    modals[modalName].close();
                });
            }
        }
        
        
        return modalName;
        
    }
    

    let callers = modalCallers.forEach( el => {

        el.addEventListener("click", function(e) {
            e.preventDefault();
            let modalWindow = createModal(el);
            modals[modalWindow].open();
        )};


    });

}


export  { modalWindows };