const CACHE_NAME = 'magical-adventure-v3';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './school-of-magic.mp3',
  './icon-192-any.png',
  './icon-192-maskable.png',
  './icon-512-any.png',
  './icon-512-maskable.png',
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('🪄 Service Worker: Installing v3 with music support...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('🪄 Service Worker: Caching files including music');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('🪄 Service Worker: Installation complete - forcing immediate activation');
        return self.skipWaiting(); // Force immediate activation
      })
      .catch((error) => {
        console.error('🪄 Service Worker: Installation failed', error);
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('🪄 Service Worker: Activating v3 with music support...');
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
        console.log('🪄 Service Worker: Activation complete - taking control immediately');
        return self.clients.claim(); // Take control of all clients immediately
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

// Helper functions for magical app data management
async function getPendingUploads() {
    try {
        // Check if we have IndexedDB access
        const request = indexedDB.open('MagicalAdventureDB', 2);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = async (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('pendingUploads')) {
                    resolve([]);
                    return;
                }
                
                const transaction = db.transaction(['pendingUploads'], 'readonly');
                const store = transaction.objectStore('pendingUploads');
                const getAllRequest = store.getAll();
                
                getAllRequest.onsuccess = () => {
                    resolve(getAllRequest.result || []);
                };
                
                getAllRequest.onerror = () => {
                    resolve([]);
                };
            };
            
            request.onerror = () => {
                resolve([]);
            };
        });
    } catch (error) {
        console.log('🪄 Service Worker: Could not access IndexedDB for pending uploads');
        return [];
    }
}

async function getPendingUserActions() {
    try {
        // Get actions from localStorage if available
        const actions = localStorage.getItem('pending_user_actions');
        return actions ? JSON.parse(actions) : [];
    } catch (error) {
        console.log('🪄 Service Worker: Could not get pending user actions');
        return [];
    }
}

async function getMagicalData() {
    try {
        // Collect magical app data from localStorage
        const magicalData = {
            selectedWand: localStorage.getItem('selected_wand'),
            achievements: localStorage.getItem('magical_achievements'),
            photoCount: 0,
            lastSync: Date.now()
        };
        
        // Count saved photos
        for (let i = 1; i <= 20; i++) {
            if (localStorage.getItem(`magical_photo_photo${i}`)) {
                magicalData.photoCount++;
            }
        }
        
        return magicalData;
    } catch (error) {
        console.log('🪄 Service Worker: Could not get magical data');
        return null;
    }
}

async function removePendingUpload(id) {
    try {
        const request = indexedDB.open('MagicalAdventureDB', 2);
        
        return new Promise((resolve) => {
            request.onsuccess = (event) => {
                const db = event.target.result;
                
                if (db.objectStoreNames.contains('pendingUploads')) {
                    const transaction = db.transaction(['pendingUploads'], 'readwrite');
                    const store = transaction.objectStore('pendingUploads');
                    store.delete(id);
                }
                
                resolve();
            };
            
            request.onerror = () => {
                console.log(`🪄 Service Worker: Could not remove pending upload ${id}`);
                resolve();
            };
        });
    } catch (error) {
        console.log(`🪄 Service Worker: Error removing pending upload ${id}:`, error);
    }
}

async function removePendingAction(id) {
    try {
        const actions = await getPendingUserActions();
        const filteredActions = actions.filter(action => action.id !== id);
        localStorage.setItem('pending_user_actions', JSON.stringify(filteredActions));
        console.log(`🪄 Service Worker: Removed pending action ${id}`);
    } catch (error) {
        console.log(`🪄 Service Worker: Error removing pending action ${id}:`, error);
    }
}

async function uploadPhotoToServer(upload) {
    // Simulate server upload - in real app, this would POST to your server
    console.log('🪄 Service Worker: Simulating photo upload to server', {
        id: upload.id,
        size: upload.data ? upload.data.length : 'unknown',
        timestamp: upload.timestamp
    });
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In a real app, you would do:
    // const response = await fetch('/api/photos', {
    //   method: 'POST',
    //   body: JSON.stringify(upload),
    //   headers: { 'Content-Type': 'application/json' }
    // });
    // return response.json();
    
    return { success: true, id: upload.id };
}

async function syncActionToServer(action) {
    console.log('🪄 Service Worker: Simulating action sync to server', action);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In a real app:
    // const response = await fetch('/api/user-actions', {
    //   method: 'POST',
    //   body: JSON.stringify(action),
    //   headers: { 'Content-Type': 'application/json' }
    // });
    
    return { success: true, action: action.type };
}

async function syncMagicalDataToServer(data) {
    console.log('🪄 Service Worker: Simulating magical data sync to server', {
        selectedWand: data.selectedWand,
        achievementCount: data.achievements ? JSON.parse(data.achievements).length : 0,
        photoCount: data.photoCount,
        lastSync: new Date(data.lastSync).toISOString()
    });
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // In a real app:
    // const response = await fetch('/api/magical-data', {
    //   method: 'POST',
    //   body: JSON.stringify(data),
    //   headers: { 'Content-Type': 'application/json' }
    // });
    
    return { success: true, syncTime: data.lastSync };
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
    icon: '/icon-192-any.png',
    badge: '/icon-192-maskable.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'open',
        title: 'Open Adventure',
        icon: '/icon-192-any.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-192-maskable.png'
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

// Enhanced message handler for magical app communication
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
    
    if (event.data && event.data.type === 'CACHE_MAGICAL_DATA') {
        // Cache important magical data
        caches.open(CACHE_NAME).then(cache => {
            // Store magical data in cache for offline access
            console.log('🪄 Service Worker: Caching magical data');
        });
    }
});

console.log('🪄 Service Worker: Enhanced magical script loaded successfully!');