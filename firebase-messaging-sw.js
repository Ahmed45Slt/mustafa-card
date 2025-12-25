importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDgIpQl4LXSSqPrvfAd8SeaR3UbYKWvEmI",
    authDomain: "mustafa-card.firebaseapp.com",
    projectId: "mustafa-card",
    storageBucket: "mustafa-card.firebasestorage.app",
    messagingSenderId: "1067081939938",
    appId: "1:1067081939938:web:4aed0222e81176180017bb"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('[Firebase SW] Initialized successfully');
} catch (error) {
    console.error('[Firebase SW] Initialization error:', error);
}

const messaging = firebase.messaging();

// Notification configuration
const NOTIFICATION_CONFIG = {
    defaultIcon: '/icon.webp',
    defaultBadge: '/icon.webp',
    defaultTitle: 'أجزاء السيارات مصطفى',
    vibrationPattern: [200, 100, 200],
    actions: [
        {
            action: 'open',
            title: 'فتح التطبيق'
        },
        {
            action: 'dismiss',
            title: 'تجاهل'
        }
    ]
};

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[Firebase SW] Background message received:', payload);
    
    try {
        const { notification, data } = payload;
        
        // Prepare notification
        const notificationOptions = {
            body: notification?.body || 'رسالة جديدة من مصطفى',
            icon: notification?.icon || NOTIFICATION_CONFIG.defaultIcon,
            badge: NOTIFICATION_CONFIG.defaultBadge,
            tag: `mustafa_${Date.now()}`,
            data: data || {},
            actions: NOTIFICATION_CONFIG.actions,
            vibrate: NOTIFICATION_CONFIG.vibrationPattern,
            requireInteraction: false,
            silent: false,
            timestamp: Date.now()
        };
        
        // Show notification
        self.registration.showNotification(
            notification?.title || NOTIFICATION_CONFIG.defaultTitle,
            notificationOptions
        );
        
    } catch (error) {
        console.error('[Firebase SW] Error handling background message:', error);
    }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[Firebase SW] Notification clicked:', event.notification);
    
    event.notification.close();
    
    const { data } = event.notification;
    const action = event.action || 'open';
    
    if (action === 'open') {
        // Open the app
        const urlToOpen = data.url || '/';
        
        event.waitUntil(
            self.clients.matchAll({ type: 'window' })
                .then(windowClients => {
                    // Check if there's already a window open
                    for (const client of windowClients) {
                        if (client.url === urlToOpen && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    
                    // Open new window
                    if (self.clients.openWindow) {
                        return self.clients.openWindow(urlToOpen);
                    }
                })
        );
    }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
    console.log('[Firebase SW] Notification closed');
});

// Install event
self.addEventListener('install', (event) => {
    console.log('[Firebase SW] Installing');
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('[Firebase SW] Activating');
    event.waitUntil(self.clients.claim());
});

console.log('[Firebase SW] Firebase Messaging Service Worker loaded');