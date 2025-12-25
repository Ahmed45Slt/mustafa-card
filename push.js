import { getMessaging, getToken, onMessage, isSupported } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

// Configuration
const VAPID_KEY = "BGTpjMZWA4WZPSs_ea1SpQxerNzGo7QaTqVFUBJQl4xDimCemIEOimU-5no3We66qvr8FygjpnImNhVVo29brvU";

// Initialize push notifications
export async function initPush(app) {
    try {
        // Check support
        const supported = await isSupported();
        if (!supported) {
            console.warn('Push notifications not supported');
            return null;
        }

        const messaging = getMessaging(app);
        
        // Request permission
        const permission = await requestPermission();
        
        if (permission === 'granted') {
            // Get token
            const token = await getToken(messaging, { vapidKey: VAPID_KEY });
            
            if (token) {
                // Save token
                saveToken(token);
                
                // Setup message listener
                setupMessageListener(messaging);
                
                // Send token to server
                await sendTokenToServer(token);
                
                return {
                    token,
                    permission,
                    messaging
                };
            }
        }
        
        return null;
        
    } catch (error) {
        console.error('Error initializing push:', error);
        return null;
    }
}

// Request permission
async function requestPermission() {
    if (!('Notification' in window)) {
        return 'unsupported';
    }
    
    const permission = Notification.permission;
    
    if (permission === 'granted') {
        return permission;
    }
    
    if (permission === 'denied') {
        return permission;
    }
    
    // Request permission
    const result = await Notification.requestPermission();
    return result;
}

// Setup message listener
function setupMessageListener(messaging) {
    onMessage(messaging, (payload) => {
        console.log('Foreground message:', payload);
        
        // Show notification
        if (payload.notification) {
            showForegroundNotification(payload);
        }
    });
}

// Show foreground notification
function showForegroundNotification(payload) {
    const { notification } = payload;
    
    if (document.visibilityState === 'visible') {
        // Page is visible, show subtle notification
        showInAppNotification(notification);
    } else {
        // Page is hidden, show native notification
        showNativeNotification(notification);
    }
}

// Show in-app notification
function showInAppNotification(notification) {
    // Create notification element
    const notificationEl = document.createElement('div');
    notificationEl.className = 'in-app-notification';
    notificationEl.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; padding:15px; background:white; 
                    border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.15); margin:10px;">
            <div style="color:#0a4f57; font-size:20px;">
                <i class="fas fa-bell"></i>
            </div>
            <div style="flex:1;">
                <div style="font-weight:bold; color:#0a4f57;">${notification.title}</div>
                <div style="color:#666; font-size:14px;">${notification.body}</div>
            </div>
            <button onclick="this.parentElement.remove()" style="background:none; border:none; color:#999; cursor:pointer;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notificationEl);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notificationEl.parentNode) {
            notificationEl.remove();
        }
    }, 5000);
}

// Show native notification
function showNativeNotification(notification) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }
    
    const options = {
        body: notification.body,
        icon: notification.icon || '/icon.webp',
        badge: '/icon.webp',
        tag: 'mustafa_notification'
    };
    
    const n = new Notification(notification.title, options);
    
    n.onclick = () => {
        window.focus();
        n.close();
    };
}

// Save token
function saveToken(token) {
    localStorage.setItem('fcm_token', token);
    localStorage.setItem('fcm_token_time', Date.now());
    console.log('Token saved:', token);
}

// Send token to server
async function sendTokenToServer(token) {
    // Implement your server token storage logic here
    console.log('Sending token to server:', token);
    
    // Example:
    // await fetch('/api/save-token', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ token })
    // });
}

// Export public API
export const PushManager = {
    initPush,
    getToken: () => localStorage.getItem('fcm_token'),
    getPermission: () => Notification.permission,
    requestPermission,
    unsubscribe: async () => {
        localStorage.removeItem('fcm_token');
        localStorage.removeItem('fcm_token_time');
        console.log('Push unsubscribed');
    }
};