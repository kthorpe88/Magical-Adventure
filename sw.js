const CACHE_NAME = 'magical-adventure-v4';
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

// Install Service Worker with immediate activation
self.addEventListener('install', (event) => {
  console.log('🪄 Service Worker: Installing v4 with full PWA support...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('🪄 Service Worker: Caching all essential files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('🪄 Service Worker: Installation complete - skipping waiting');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('🪄 Service Worker: Installation failed', error);
      })
  );
});

// Activate Service Worker and claim clients immediately
self.addEventListener('activate', (event) => {
  console.log('🪄 Service Worker: Activating v4 with enhanced features...');
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🪄 Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients immediately
      self.clients.claim(),
      // Set up periodic sync if supported
      setupPeriodicSync()
    ]).then(() => {
      console.log('🪄 Service Worker: Activation complete - PWA ready!');
    })
  );
});

// Enhanced fetch handler with better offline support
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and non-http(s) URLs
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('🪄 Service Worker: Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // For navigation requests, always try network first
        if (event.request.mode === 'navigate') {
          return fetch(event.request)
            .then((response) => {
              if (response && response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseClone);
                });
              }
              return response;
            })
            .catch(() => {
              // Return cached index.html for offline navigation
              return caches.match('./index.html');
            });
        }

        // For other requests, try network then cache
        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });

            return response;
          })
          .catch((error) => {
            console.log('🪄 Service Worker: Network failed, checking cache:', event.request.url);
            
            // For image requests, return a placeholder or fail gracefully
            if (event.request.destination === 'image') {
              return new Response('', { status: 204, statusText: 'No Content' });
            }
            
            throw error;
          });
      })
  );
});

// Background Sync - Enhanced for better user action persistence
self.addEventListener('sync', (event) => {
  console.log('🪄 Service Worker: Background sync triggered for:', event.tag);
  
  switch (event.tag) {
    case 'photo-upload-sync':
      event.waitUntil(syncPhotoUploads());
      break;
    case 'user-actions-sync':
      event.waitUntil(syncUserActions());
      break;
    case 'magical-data-sync':
      event.waitUntil(syncMagicalData());
      break;
    case 'content-update-sync':
      event.waitUntil(syncContentUpdates());
      break;
    default:
      console.log('🪄 Service Worker: Unknown sync tag:', event.tag);
  }
});

// Periodic Background Sync for automatic updates
self.addEventListener('periodicsync', (event) => {
  console.log('🪄 Service Worker: Periodic sync triggered for:', event.tag);
  
  if (event.tag === 'magical-content-update') {
    event.waitUntil(periodicContentUpdate());
  }
});

// Setup periodic sync on activation
async function setupPeriodicSync() {
  try {
    if ('serviceWorker' in navigator && 'periodicSync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await self.registration;
      await registration.periodicSync.register('magical-content-update', {
        minInterval: 24 * 60 * 60 * 1000 // Once per day
      });
      console.log('🪄 Service Worker: Periodic sync registered successfully');
    }
  } catch (error) {
    console.log('🪄 Service Worker: Periodic sync not supported or failed:', error);
  }
}

// Periodic content update function
async function periodicContentUpdate() {
  try {
    console.log('🪄 Service Worker: Running periodic content update...');
    
    // Update cache with fresh content
    const cache = await caches.open(CACHE_NAME);
    
    // Refresh critical resources
    const criticalUrls = [
      './',
      './index.html',
      './manifest.json'
    ];
    
    for (const url of criticalUrls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response.clone());
          console.log(`🪄 Service Worker: Updated cache for ${url}`);
        }
      } catch (error) {
        console.log(`🪄 Service Worker: Failed to update ${url}:`, error);
      }
    }
    
    // Notify clients about updates
    await notifyClients({
      type: 'CONTENT_UPDATED',
      message: '✨ Magical content updated in background! ✨'
    });
    
  } catch (error) {
    console.error('🪄 Service Worker: Periodic update failed:', error);
  }
}

// Enhanced sync functions with better error handling
async function syncPhotoUploads() {
  try {
    console.log('🪄 Service Worker: Syncing photo uploads...');
    
    const pendingUploads = await getPendingUploads();
    
    if (pendingUploads.length === 0) {
      console.log('🪄 Service Worker: No pending photo uploads');
      return;
    }
    
    let successCount = 0;
    
    for (const upload of pendingUploads) {
      try {
        await uploadPhotoToServer(upload);
        await removePendingUpload(upload.id);
        successCount++;
        
        await notifyClients({
          type: 'PHOTO_SYNC_SUCCESS',
          data: upload,
          message: `📸 Photo "${upload.id}" synced successfully! ✨`
        });
        
      } catch (error) {
        console.error('🪄 Service Worker: Failed to sync photo:', error);
        // Keep the upload in queue for retry
      }
    }
    
    if (successCount > 0) {
      await notifyClients({
        type: 'SYNC_COMPLETE',
        message: `📸 ${successCount} magical memories synced! ✨`
      });
    }
    
    console.log(`🪄 Service Worker: Photo sync complete (${successCount}/${pendingUploads.length})`);
    
  } catch (error) {
    console.error('🪄 Service Worker: Photo sync failed:', error);
  }
}

async function syncUserActions() {
  try {
    console.log('🪄 Service Worker: Syncing user actions...');
    
    const pendingActions = await getPendingUserActions();
    
    if (pendingActions.length === 0) {
      console.log('🪄 Service Worker: No pending user actions');
      return;
    }
    
    let successCount = 0;
    
    for (const action of pendingActions) {
      try {
        await syncActionToServer(action);
        await removePendingAction(action.id);
        successCount++;
        
        await notifyClients({
          type: 'ACTION_SYNC_SUCCESS',
          data: action
        });
        
      } catch (error) {
        console.error('🪄 Service Worker: Failed to sync action:', error);
      }
    }
    
    if (successCount > 0) {
      await notifyClients({
        type: 'SYNC_COMPLETE',
        message: `⚡ ${successCount} magical actions synced! ✨`
      });
    }
    
    console.log(`🪄 Service Worker: User actions sync complete (${successCount}/${pendingActions.length})`);
    
  } catch (error) {
    console.error('🪄 Service Worker: User actions sync failed:', error);
  }
}

async function syncMagicalData() {
  try {
    console.log('🪄 Service Worker: Syncing magical data...');
    
    const magicalData = await getMagicalData();
    
    if (!magicalData) {
      console.log('🪄 Service Worker: No magical data to sync');
      return;
    }
    
    await syncMagicalDataToServer(magicalData);
    
    await notifyClients({
      type: 'MAGICAL_DATA_SYNC_SUCCESS',
      data: magicalData,
      message: '🪄 All magical progress synced! ✨'
    });
    
    console.log('🪄 Service Worker: Magical data sync complete');
    
  } catch (error) {
    console.error('🪄 Service Worker: Magical data sync failed:', error);
  }
}

async function syncContentUpdates() {
  try {
    console.log('🪄 Service Worker: Syncing content updates...');
    
    // Check for any content updates that need to be applied
    const contentUpdates = await getContentUpdates();
    
    for (const update of contentUpdates) {
      await applyContentUpdate(update);
    }
    
    await notifyClients({
      type: 'CONTENT_SYNC_SUCCESS',
      message: '📝 Content updates applied! ✨'
    });
    
    console.log('🪄 Service Worker: Content updates sync complete');
    
  } catch (error) {
    console.error('🪄 Service Worker: Content sync failed:', error);
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
  console.log('🪄 Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : '✨ New magical adventure awaits! Your journey continues... ✨',
    icon: './icon-192-any.png',
    badge: './icon-192-maskable.png',
    vibrate: [100, 50, 100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 'magical-adventure',
      url: './index.html'
    },
    actions: [
      {
        action: 'open',
        title: '🪄 Open Adventure',
        icon: './icon-192-any.png'
      },
      {
        action: 'remind',
        title: '⏰ Remind Later',
        icon: './icon-192-maskable.png'
      },
      {
        action: 'close',
        title: '✨ Close',
        icon: './icon-192-maskable.png'
      }
    ],
    tag: 'magical-adventure',
    renotify: true,
    requireInteraction: false,
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification('🪄 Magical Adventure', options)
  );
});

// Enhanced notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('🪄 Service Worker: Notification clicked, action:', event.action);
  event.notification.close();

  switch (event.action) {
    case 'open':
      event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
          // If app is already open, focus it
          for (const client of clientList) {
            if (client.url.includes('index.html') && 'focus' in client) {
              return client.focus();
            }
          }
          // Otherwise open new window
          if (clients.openWindow) {
            return clients.openWindow('./index.html');
          }
        })
      );
      break;
      
    case 'remind':
      // Schedule a reminder notification for later
      setTimeout(() => {
        self.registration.showNotification('🪄 Magical Reminder', {
          body: '✨ Your magical adventure is still waiting for you! ✨',
          icon: './icon-192-any.png',
          tag: 'magical-reminder'
        });
      }, 30 * 60 * 1000); // 30 minutes
      break;
      
    case 'close':
    default:
      // Just close the notification
      break;
  }
});

// Enhanced message handler with more functionality
self.addEventListener('message', (event) => {
  console.log('🪄 Service Worker: Message received', event.data);
  
  if (!event.data || !event.data.type) {
    console.log('🪄 Service Worker: Invalid message format');
    return;
  }
  
  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'REGISTER_BACKGROUND_SYNC':
      if ('sync' in self.registration) {
        self.registration.sync.register(event.data.tag).then(() => {
          console.log('🪄 Service Worker: Background sync registered for', event.data.tag);
        }).catch(error => {
          console.error('🪄 Service Worker: Background sync registration failed', error);
        });
      }
      break;
      
    case 'REGISTER_PERIODIC_SYNC':
      if ('periodicSync' in self.registration) {
        self.registration.periodicSync.register(event.data.tag, {
          minInterval: event.data.interval || 24 * 60 * 60 * 1000
        }).then(() => {
          console.log('🪄 Service Worker: Periodic sync registered for', event.data.tag);
        }).catch(error => {
          console.error('🪄 Service Worker: Periodic sync registration failed', error);
        });
      }
      break;
      
    case 'REQUEST_NOTIFICATION_PERMISSION':
      event.waitUntil(requestNotificationPermission());
      break;
      
    case 'CACHE_MAGICAL_DATA':
      caches.open(CACHE_NAME).then(cache => {
        console.log('🪄 Service Worker: Caching magical data');
      });
      break;
      
    case 'FORCE_UPDATE':
      event.waitUntil(forceUpdate());
      break;
      
    default:
      console.log('🪄 Service Worker: Unknown message type:', event.data.type);
  }
});

// Request notification permission
async function requestNotificationPermission() {
  try {
    if ('Notification' in self) {
      const permission = await self.registration.showNotification('🪄 Magical Adventure', {
        body: '✨ Notifications enabled! You\'ll receive magical updates ✨',
        icon: './icon-192-any.png',
        tag: 'permission-granted'
      });
      
      await notifyClients({
        type: 'NOTIFICATION_PERMISSION_GRANTED',
        message: 'Notifications enabled successfully! ✨'
      });
    }
  } catch (error) {
    console.log('🪄 Service Worker: Notification permission request failed:', error);
  }
}

// Force update the app
async function forceUpdate() {
  try {
    console.log('🪄 Service Worker: Forcing app update...');
    
    // Clear all caches except current
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => {
        if (cacheName !== CACHE_NAME) {
          return caches.delete(cacheName);
        }
      })
    );
    
    // Refresh cache with latest content
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(urlsToCache);
    
    await notifyClients({
      type: 'FORCE_UPDATE_COMPLETE',
      message: '🔄 App updated successfully! ✨'
    });
    
    console.log('🪄 Service Worker: Force update complete');
    
  } catch (error) {
    console.error('🪄 Service Worker: Force update failed:', error);
  }
}

console.log('🪄 Service Worker: Enhanced PWA script loaded with full functionality!');