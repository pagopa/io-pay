export function initDropdowns(): void {
  const dropdownElements = document.querySelectorAll('.btn-dropdown');
  dropdownElements.forEach(el => {
    el.addEventListener('click', function () {
      // const parentEl = el.parentNode;
      const opened = el.getAttribute('aria-expanded') === 'true';
      const target = el.getAttribute('data-target') || null;
      if (target == null) {
        return;
      }
      const targetEl = document.getElementById(target);
      targetEl?.addEventListener('click', function () {
        document.body.classList.remove('dropdown-opened');
        document.body.removeAttribute('data-dropdownopened');
        el.setAttribute('aria-expanded', 'false');
        // parentEl.classList.remove('show');
        el.parentElement?.classList.remove('show');
        targetEl.classList.remove('show');
      });
      if (opened === true) {
        document.body.classList.remove('dropdown-opened');
        document.body.removeAttribute('data-dropdownopened');
        el.setAttribute('aria-expanded', 'false');
        el.parentElement?.classList.remove('show');
        targetEl?.classList.remove('show');
      } else {
        document.body.classList.add('dropdown-opened');
        document.body.setAttribute('data-dropdownopened', target);
        el.setAttribute('aria-expanded', 'true');
        el.parentElement?.classList.add('show');
        targetEl?.classList.add('show');
      }
    });
  });
}
