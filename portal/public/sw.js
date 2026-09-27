// Service worker minimo: solo habilita la instalacion como PWA.
// No cachea nada a proposito: la app siempre va a red (los datos son en tiempo real
// y un cache stale podria mostrar horas/fichajes desactualizados).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
