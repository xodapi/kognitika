self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log('[SW] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      console.log('[SW] All caches deleted. Unregistering...');
      return self.registration.unregister();
    }).then(function() {
      return self.clients.matchAll();
    }).then(function(clients) {
      console.log('[SW] Reloading clients...');
      clients.forEach(client => client.navigate(client.url));
    })
  );
});
