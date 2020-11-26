import languages from '../assets/json/languages.json';
import { getUrlParameter } from './urlUtilities';

// translate interface with a given Lang
export function translateAll(lang = 'it') {
    // eslint-disable-next-line no-prototype-builtins
    const langExists = languages.hasOwnProperty(lang) ? true : false;
    if (!langExists) {
        return false;
    }

    const dictionary: Record<string, any> = (languages as Record<string, any>).lang;
    const langElements = document.querySelectorAll('[data-lang]');
    const langButton = document.querySelector("a[data-target='langList'] > .lang__current");
    sessionStorage.setItem('lang', lang);
    if (langButton) {
        // eslint-disable-next-line functional/immutable-data
        langButton.textContent = lang.toUpperCase();
    }

    langElements.forEach(el => {
        const langKey = el.getAttribute('data-lang');
        // eslint-disable-next-line no-prototype-builtins
        if (dictionary.hasOwnProperty(langKey || '')) {
            // eslint-disable-next-line no-prototype-builtins
            const myHTML = dictionary.hasOwnProperty(langKey || '') && dictionary[langKey || ''];

            // eslint-disable-next-line functional/immutable-data
            el.innerHTML = myHTML;
        }
    });
}
// Language selectors event
export function setTranslateBtns() {
    const langSelectors = document.querySelectorAll('.langSelector');
    const langByQS = getUrlParameter('l').toLowerCase();

    const langStored = sessionStorage.getItem('lang');
    if (langStored !== null) {
        translateAll(langStored);
    } else if (langByQS !== '') {
        translateAll(langByQS);
    }
    langSelectors.forEach(el => {
        el.addEventListener('click', function (event) {
            // const langSelected = event?.target?.getAttribute('data-langselect');
            const langSelected = 'it';
            translateAll(langSelected);
        });
    });
}
