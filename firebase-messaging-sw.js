// firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

const firebaseConfig = {
    apiKey: "AIzaSyDgIpQl4LXSSqPrvfAd8SeaR3UbYKWvEmI",
    authDomain: "mustafa-card.firebaseapp.com",
    projectId: "mustafa-card",
    storageBucket: "mustafa-card.firebasestorage.app",
    messagingSenderId: "1067081939938",
    appId: "1:1067081939938:web:4aed0222e81176180017bb"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// معالجة الإشعارات في الخلفية
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message:', payload);
    
    const notificationTitle = payload.notification?.title || 'أجزاء السيارات مصطفى';
    const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || 'رسالة جديدة',
        icon: payload.notification?.icon || './icon.png',
        badge: './icon.png',
        data: payload.data || {},
        tag: `bg_${Date.now()}`
    };
    
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// معالجة نقر الإشعار
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});
