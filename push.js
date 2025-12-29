// push.js - النسخة المكتملة والمتوافقة
import { 
    getMessaging, 
    getToken, 
    isSupported,
    onMessage 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

// مفتاح VAPID العام - استبدله بمفتاحك من Firebase Console
const VAPID_KEY = "O7v64-l_jI82Ki6WMPRkLApi0BsqeR2Srl8XmUbFlQA";

/**
 * تهيئة إشعارات Push
 * @param {Object} app - كائن Firebase App
 * @returns {Object} كائن يحتوي على token و messaging
 */
export async function initPush(app) {
    try {
        // التحقق من دعم المتصفح
        const supported = await isSupported();
        if (!supported) {
            console.log('⚠️ Push notifications not supported in this browser');
            return null;
        }

        const messaging = getMessaging(app);
        
        // طلب إذن الإشعارات
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('⚠️ Notification permission denied');
            return null;
        }
        
        // تسجيل Service Worker
        let registration;
        try {
            registration = await navigator.serviceWorker.register('./firebase-messaging-sw.js', {
                scope: './'
            });
            console.log('✅ Push Service Worker registered');
        } catch (swError) {
            console.error('❌ Service Worker registration failed:', swError);
            // محاولة استخدام SW الموجود
            registration = await navigator.serviceWorker.ready;
        }
        
        // الحصول على token
        const token = await getToken(messaging, { 
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
        });

        if (token) {
            console.log('✅ Push Token:', token);
            await saveTokenToFirebase(token);
            setupMessageListener(messaging);
            return { token, messaging };
        } else {
            console.log('❌ No registration token available');
            return null;
        }
    } catch (error) {
        console.error('❌ Push Init Error:', error);
        return null;
    }
}

/**
 * حفظ token في Firebase
 * @param {string} token - FCM token
 */
async function saveTokenToFirebase(token) {
    try {
        // استيراد firebase.js ديناميكياً
        const { db, doc, setDoc, serverTimestamp } = await import('./firebase.js');
        
        const tokensRef = doc(db, "push_tokens", token);
        await setDoc(tokensRef, {
            token: token,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            createdAt: serverTimestamp(),
            lastUsed: serverTimestamp()
        }, { merge: true });
        
        console.log('✅ Token saved to Firebase');
        
        // حفظ محلياً أيضاً
        localStorage.setItem('mustafa_fcm_token', token);
        
    } catch (error) {
        console.error('❌ Error saving token:', error);
        // حفظ محلي فقط
        localStorage.setItem('mustafa_fcm_token', token);
    }
}

/**
 * إعداد مستمع الرسائل
 * @param {Object} messaging - كائن messaging
 */
function setupMessageListener(messaging) {
    // الرسائل عندما يكون التطبيق مفتوحاً
    onMessage(messaging, (payload) => {
        console.log('📨 Message received while app is open:', payload);
        
        showPushNotification(payload);
    });
}

/**
 * عرض إشعار push
 * @param {Object} payload - بيانات الإشعار
 */
function showPushNotification(payload) {
    try {
        const { notification, data } = payload;
        
        const options = {
            body: notification?.body || data?.body || 'رسالة جديدة من مصطفى',
            icon: notification?.icon || data?.icon || './icon.png',
            badge: './icon.png',
            tag: `mustafa_push_${Date.now()}`,
            data: data || {},
            requireInteraction: false,
            silent: false,
            vibrate: [200, 100, 200],
            actions: [
                {
                    action: 'open',
                    title: 'فتح'
                },
                {
                    action: 'close',
                    title: 'إغلاق'
                }
            ]
        };
        
        // عرض الإشعار
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(
                notification?.title || data?.title || 'أجزاء السيارات مصطفى',
                options
            );
        });
        
        // عرض toast في الواجهة أيضاً
        if (window.showToast) {
            window.showToast(notification?.body || data?.body || 'رسالة جديدة', 'info');
        }
        
    } catch (error) {
        console.error('❌ Error showing push notification:', error);
    }
}

/**
 * حذف token
 */
export async function deleteToken() {
    try {
        const { getMessaging, deleteToken } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js");
        const messaging = getMessaging();
        
        await deleteToken(messaging);
        localStorage.removeItem('mustafa_fcm_token');
        
        console.log('✅ Push token deleted');
        return true;
    } catch (error) {
        console.error('❌ Error deleting token:', error);
        return false;
    }
}

/**
 * التحقق مما إذا كانت الإشعارات مفعلة
 */
export function isPushEnabled() {
    return Notification.permission === 'granted' && 
           localStorage.getItem('mustafa_fcm_token') !== null;
}

/**
 * تفعيل/تعطيل الإشعارات
 */
export async function togglePushNotifications() {
    try {
        if (isPushEnabled()) {
            await deleteToken();
            if (window.showToast) {
                window.showToast('تم تعطيل الإشعارات', 'info');
            }
            return false;
        } else {
            // استيراد app من firebase.js
            const { app } = await import('./firebase.js');
            const result = await initPush(app);
            
            if (result && window.showToast) {
                window.showToast('تم تفعيل الإشعارات ✅', 'success');
            }
            return !!result;
        }
    } catch (error) {
        console.error('❌ Error toggling push notifications:', error);
        return false;
    }
}

/**
 * إرسال إشعار تجريبي
 */
export async function sendTestNotification() {
    try {
        const token = localStorage.getItem('mustafa_fcm_token');
        if (!token) {
            console.log('❌ No token found');
            return false;
        }
        
        // في الواقع، هذا يجب أن يتم من الخادم
        // هذا مثال فقط
        console.log('📤 Sending test notification to:', token.substring(0, 20) + '...');
        
        // محاكاة إشعار محلي
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('أجزاء السيارات مصطفى', {
                body: 'هذا إشعار تجريبي من تطبيق قطع غيار مصطفى! 🚗',
                icon: './icon.png',
                badge: './icon.png'
            });
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error sending test notification:', error);
        return false;
    }
}
