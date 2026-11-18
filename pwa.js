'use strict';

(() => {
  const install = document.querySelector('#install-button');
  const card = document.querySelector('#install-card');
  const offlineReady = document.querySelector('#offline-ready');
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let pendingPrompt;

  if (standalone) card.hidden = true;

  window.addEventListener('beforeinstallprompt', event => {
    if (standalone) return;
    event.preventDefault();
    pendingPrompt = event;
    install.hidden = false;
  });

  install.addEventListener('click', async () => {
    if (!pendingPrompt) return;
    const prompt = pendingPrompt;
    pendingPrompt = undefined;
    install.hidden = true;
    try { await prompt.prompt(); } catch { /* Browser menu remains available. */ }
  });

  window.addEventListener('appinstalled', () => {
    install.hidden = true;
    pendingPrompt = undefined;
    card.hidden = true;
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(async () => {
      await navigator.serviceWorker.ready;
      const showReady = () => { if (navigator.serviceWorker.controller) offlineReady.hidden = false; };
      navigator.serviceWorker.addEventListener('controllerchange', showReady);
      showReady();
    }).catch(() => { /* The calendar still works online. */ });
  }
})();
