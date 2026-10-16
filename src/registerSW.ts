/* Registra o service worker do PWA Rotina (gerado no build de produção).
 * Em desenvolvimento, não há sw.js — o registro é ignorado silenciosamente. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Sem sw.js (ex.: modo dev) ou registro bloqueado — o app segue normal.
    })
  })
}
