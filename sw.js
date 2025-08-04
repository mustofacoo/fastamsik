const CACHE_NAME = 'tahfidz-tracker-v1.0.0';
const CACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/vue@3/dist/vue.global.js',
  'https://unpkg.com/@supabase/supabase-js@2',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://fonts.gstatic.com/s/inter/v12/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell');
        return cache.addAll(CACHE_URLS.map(url => new Request(url, {
          cache: 'no-cache'
        })));
      })
      .catch(error => {
        console.error('Cache failed:', error);
        // Don't fail the install if some resources can't be cached
        return caches.open(CACHE_NAME);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip Supabase requests - always go to network
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  // Skip external API calls that need fresh data
  if (event.request.url.includes('api') && !event.request.url.includes(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if available
        if (response) {
          // For HTML requests, check for network update in background
          if (event.request.headers.get('accept')?.includes('text/html')) {
            // Background fetch for HTML files to keep them fresh
            fetch(event.request)
              .then(fetchResponse => {
                if (fetchResponse.ok) {
                  const responseClone = fetchResponse.clone();
                  caches.open(CACHE_NAME)
                    .then(cache => cache.put(event.request, responseClone));
                }
              })
              .catch(() => {
                // Network failed, but we have cache
              });
          }
          return response;
        }

        // Not in cache, fetch from network
        return fetch(event.request)
          .then(fetchResponse => {
            // Don't cache non-successful responses
            if (!fetchResponse.ok) {
              return fetchResponse;
            }

            // Clone the response because it can only be consumed once
            const responseClone = fetchResponse.clone();

            // Add to cache for future use
            caches.open(CACHE_NAME)
              .then(cache => {
                // Only cache certain types of requests
                const url = new URL(event.request.url);
                
                // Cache same-origin requests and specific external resources
                if (url.origin === self.location.origin || 
                    url.hostname === 'cdn.tailwindcss.com' ||
                    url.hostname === 'unpkg.com' ||
                    url.hostname === 'fonts.googleapis.com' ||
                    url.hostname === 'fonts.gstatic.com') {
                  cache.put(event.request, responseClone);
                }
              })
              .catch(error => console.log('Cache put failed:', error));

            return fetchResponse;
          })
          .catch(error => {
            console.log('Fetch failed:', error);
            
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            
            // For other requests, we could return a default offline resource
            throw error;
          });
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', event => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Here you could implement background sync logic
      // For example, sync pending data to Supabase when back online
      clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'BACKGROUND_SYNC',
            payload: 'sync-data'
          });
        });
      })
    );
  }
});

// Push notifications (if needed in future)
self.addEventListener('push', event => {
  if (!event.data) {
    return;
  }

  const options = {
    body: event.data.text(),
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Buka App',
        icon: './icon-192.png'
      },
      {
        action: 'close',
        title: 'Tutup',
        icon: './icon-192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Tahfidz Tracker', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    // Open the app
    event.waitUntil(
      clients.matchAll().then(clients => {
        // Check if app is already open
        for (let client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // If app is not open, open it
        if (clients.openWindow) {
          return clients.openWindow('./');
        }
      })
    );
  }
});

// Handle messages from the main app
self.addEventListener('message', event => {
  console.log('SW received message:', event.data);
  
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
      case 'GET_VERSION':
        event.ports[0].postMessage({ version: CACHE_NAME });
        break;
      case 'CACHE_URLS':
        // Cache additional URLs if needed
        event.waitUntil(
          caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(event.data.urls);
          })
        );
        break;
    }
  }
});

// Periodic background sync (experimental)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'tahfidz-sync') {
    event.waitUntil(
      // Perform periodic sync operations
      clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'PERIODIC_SYNC',
            payload: 'sync-tahfidz-data'
          });
        });
      })
    );
  }
});