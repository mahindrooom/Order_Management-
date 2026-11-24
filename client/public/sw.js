// Pluckk Mobile PWA Service Worker (Push Notifications & Live Background Alerts)
const SW_VERSION = 'pluckk-sw-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

// Always pass network requests directly to server so Vite dynamic chunks never break
self.addEventListener('fetch', (event) => {
  // Do not intercept or block any network requests
  return;
});

// Native Push Notifications receiver for background mobile alerts
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '📢 Pluckk Mandi Requirement Update';
  const options = {
    body: data.message || 'Requirements have been updated in your supply catalogue. Tap to view!',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [250, 100, 250],
    data: { url: '/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || '/');
      }
    })
  );
});
