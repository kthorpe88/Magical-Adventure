const CACHE_NAME = 'magical-adventure-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './android-launchericon-48-48.png',
  './android-launchericon-72-72.png',
  './android-launchericon-96-96.png',
  './android-launchericon-144-144.png',
  './android-launchericon-192-192.png',
  './android-launchericon-512-512.png',
  './android-launchericon-192-192-maskable.png',
  './android-launchericon-512-512-maskable.png',
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

// Fetch Event - Cache First Strategy with Network Fallback
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
              return caches.match('./index.html');
            }
            
            // For other resources, just fail
            throw error;
          });
      })
  );
});

// Background Sync - Keep user actions in sync when connection returns
self.addEventListener('sync', (event) => {
  console.log('🪄 Service Worker: Background sync triggered for:', event.tag);
  
  if (event.tag === 'photo-upload-sync') {
    event.waitUntil(syncPhotoUploads());
  }
  
  if (event.tag === 'user-actions-sync') {
    event.waitUntil(syncUserActions());
  }
  
  if (event.tag === 'magical-data-sync') {
    event.waitUntil(syncMagicalData());
  }
});

// Sync photo uploads when connection is restored
async function syncPhotoUploads() {
  try {
    console.log('🪄 Service Worker: Syncing photo uploads...');
    
    // Get pending photo uploads from IndexedDB or localStorage
    const pendingUploads = await getPendingUploads();
    
    for (const upload of pendingUploads) {
      try {
        // Attempt to upload photo to server
        await uploadPhotoToServer(upload);
        
        // Remove from pending uploads on success
        await removePendingUpload(upload.id);
        
        // Notify main thread of successful sync
        await notifyClients({
          type: 'PHOTO_SYNC_SUCCESS',
          data: upload
        });
        
      } catch (error) {
        console.error('🪄 Service Worker: Failed to sync photo:', error);
      }
    }
    
    console.log('🪄 Service Worker: Photo sync complete');
  } catch (error) {
    console.error('🪄 Service Worker: Photo sync failed:', error);
    throw error;
  }
}

// Sync user actions (wand selections, quiz answers, etc.)
async function syncUserActions() {
  try {
    console.log('🪄 Service Worker: Syncing user actions...');
    
    const pendingActions = await getPendingUserActions();
    
    for (const action of pendingActions) {
      try {
        await syncActionToServer(action);
        await removePendingAction(action.id);
        
        await notifyClients({
          type: 'ACTION_SYNC_SUCCESS',
          data: action
        });
        
      } catch (error) {
        console.error('🪄 Service Worker: Failed to sync action:', error);
      }
    }
    
    console.log('🪄 Service Worker: User actions sync complete');
  } catch (error) {
    console.error('🪄 Service Worker: User actions sync failed:', error);
    throw error;
  }
}

// Sync magical data (achievements, progress, etc.)
async function syncMagicalData() {
  try {
    console.log('🪄 Service Worker: Syncing magical data...');
    
    // Sync achievements, spell casting progress, etc.
    const magicalData = await getMagicalData();
    
    if (magicalData) {
      await syncMagicalDataToServer(magicalData);
      
      await notifyClients({
        type: 'MAGICAL_DATA_SYNC_SUCCESS',
        data: magicalData
      });
    }
    
    console.log('🪄 Service Worker: Magical data sync complete');
  } catch (error) {
    console.error('🪄 Service Worker: Magical data sync failed:', error);
    throw error;
  }
}

// Helper functions for data management
async function getPendingUploads() {
  // In a real app, this would read from IndexedDB
  // For now, return empty array
  return [];
}

async function removePendingUpload(id) {
  // Remove from IndexedDB
  console.log(`🪄 Service Worker: Removing pending upload ${id}`);
}

async function uploadPhotoToServer(upload) {
  // Upload photo to your server
  console.log('🪄 Service Worker: Uploading photo to server', upload);
}

async function getPendingUserActions() {
  // Get pending user actions from storage
  return [];
}

async function removePendingAction(id) {
  console.log(`🪄 Service Worker: Removing pending action ${id}`);
}

async function syncActionToServer(action) {
  console.log('🪄 Service Worker: Syncing action to server', action);
}

async function getMagicalData() {
  // Get magical app data from localStorage/IndexedDB
  return null;
}

async function syncMagicalDataToServer(data) {
  console.log('🪄 Service Worker: Syncing magical data to server', data);
}

// Notify all clients about sync results
async function notifyClients(message) {
  const clients = await self.clients.matchAll({
    includeUncontrolled: true,
    type: 'window'
  });
  
  clients.forEach(client => {
    client.postMessage(message);
  });
}

// Push Notifications
self.addEventListener('push', (event) => {
  console.log('🪄 Service Worker: Push message received');
  
  const options = {
    body: event.data ? event.data.text() : 'New magical adventure awaits! ✨',
    icon: '/android-launchericon-192-192.png',
    badge: '/android-launchericon-96-96.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'open',
        title: 'Open Adventure',
        icon: '/android-launchericon-72-72.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/android-launchericon-48-48.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('🪄 Magical Adventure', options)
  );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  console.log('🪄 Service Worker: Notification clicked');
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('./index.html')
    );
  }
});

// Message Handler (for communication with main thread)
self.addEventListener('message', (event) => {
  console.log('🪄 Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'REGISTER_BACKGROUND_SYNC') {
    // Register background sync when requested by main thread
    self.registration.sync.register(event.data.tag).then(() => {
      console.log('🪄 Service Worker: Background sync registered for', event.data.tag);
    }).catch(error => {
      console.error('🪄 Service Worker: Background sync registration failed', error);
    });
  }
});

console.log('🪄 Service Worker: Enhanced script loaded successfully with background sync!');