export async function initPush(app) {
    try {
        const supported = await isSupported();
        if (!supported) return null;

        const messaging = getMessaging(app);
        
        // تسجيل الـ Service Worker يدوياً لـ Firebase لحل مشكلة "Not Found"
        const registration = await navigator.serviceWorker.register('./firebase-messaging-sw.js');
        
        const token = await getToken(messaging, { 
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration // نربط التسجيل هنا ليعرف مكانه
        });

        if (token) {
            console.log('✅ Push Token:', token);
            saveToken(token);
            return { token, messaging };
        }
    } catch (error) {
        console.error('❌ Push Init Error:', error);
    }
}

