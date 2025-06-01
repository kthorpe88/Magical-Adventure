const CACHE_NAME = 'magical-adventure-v1';
const urlsToCache = [
  './',
  './Stephanie\'s Magical Adventure.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('🪄 Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('🪄 Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('🪄 Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('🪄 Service Worker: Installation failed', error);
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('🪄 Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🪄 Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('🪄 Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch Event - Cache First Strategy
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          console.log('🪄 Service Worker: Serving from cache', event.request.url);
          return response;
        }

        // Otherwise fetch from network
        console.log('🪄 Service Worker: Fetching from network', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.error('🪄 Service Worker: Fetch failed', error);
            
            // Return a custom offline page or fallback
            if (event.request.destination === 'document') {
              return caches.match('./Stephanie\'s Magical Adventure.html');
            }
            
            // For other resources, just fail
            throw error;
          });
      })
  );
});

// Background Sync (for future offline functionality)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('🪄 Service Worker: Background sync triggered');
    // Handle background sync here if needed
  }
});

// Push Notifications (for future use)
self.addEventListener('push', (event) => {
  console.log('🪄 Service Worker: Push message received');
  
  const options = {
    body: event.data ? event.data.text() : 'New magical adventure awaits! ✨',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiBmaWxsPSIjMWExYTJlIi8+Cjx0ZXh0IHg9Ijk2IiB5PSI5NiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9Ijc0IiBmaWxsPSIjZDRhZjM3IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+8J+qhDwvdGV4dD4KPC9zdmc+',
    badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjcyIiBoZWlnaHQ9IjcyIiBmaWxsPSIjOGIwMDAwIi8+Cjx0ZXh0IHg9IjM2IiB5PSIzNiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjMwIiBmaWxsPSIjZDRhZjM3IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+8J+qhDwvdGV4dD4KPC9zdmc+',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('🪄 Magical Adventure', options)
  );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  console.log('🪄 Service Worker: Notification clicked');
  event.notification.close();

  event.waitUntil(
    clients.openWindow('./Stephanie\'s Magical Adventure.html')
  );
});

// Message Handler (for communication with main thread)
self.addEventListener('message', (event) => {
  console.log('🪄 Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('🪄 Service Worker: Script loaded successfully!');