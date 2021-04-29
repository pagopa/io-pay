// eslint-disable-next-line sonarjs/cognitive-complexity
document.addEventListener('DOMContentLoaded', async () => {
  window.sessionStorage.clear();

  const cancelButton = document.getElementById('cancel');
  cancelButton?.addEventListener('click', (e: Event) => {
    e.preventDefault();
    window.close();
  });
});
export {};
