
// firebase.js - النسخة المحسنة والمحدثة
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    doc, 
    updateDoc, 
    deleteDoc,
    increment, 
    getDoc,
    getDocs,
    setDoc,
    serverTimestamp,
    writeBatch,
    enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// إعدادات Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDgIpQl4LXSSqPrvfAd8SeaR3UbYKWvEmI",
    authDomain: "mustafa-card.firebaseapp.com",
    projectId: "mustafa-card",
    storageBucket: "mustafa-card.firebasestorage.app",
    messagingSenderId: "1067081939938",
    appId: "1:1067081939938:web:4aed0222e81176180017bb"
};

// تهيئة Firebase
import { initializeFirestore, persistentLocalCache } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
    localCache: persistentLocalCache(/*settings*/ {})
});
const auth = getAuth(app);

// تمكين التخزين المحلي (Offline Support)
(async function enableOfflineSupport() {
    try {
        await enableIndexedDbPersistence(db);
        console.log("✅ Offline persistence enabled");
    } catch (err) {
        if (err.code === 'failed-precondition') {
            console.log("⚠️ Multiple tabs open, persistence only in one");
        } else if (err.code === 'unimplemented') {
            console.log("⚠️ Browser doesn't support persistence");
        }
    }
})();

// ============ مدير المصادقة ============
class AuthManager {
    static async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return userCredential.user;
        } catch (error) {
            let errorMessage = 'حدث خطأ في تسجيل الدخول';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'المستخدم غير موجود';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'كلمة المرور غير صحيحة';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'البريد الإلكتروني غير صالح';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'تم تجاوز عدد المحاولات، حاول لاحقاً';
                    break;
            }
            
            throw new Error(errorMessage);
        }
    }

    static async logout() {
        try {
            await signOut(auth);
            return true;
        } catch (error) {
            console.error('❌ Error logging out:', error);
            throw new Error('حدث خطأ في تسجيل الخروج');
        }
    }

    static async createAdminUser(email, password, displayName) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            await updateProfile(userCredential.user, {
                displayName: displayName
            });

            await setDoc(doc(db, "admin_users", userCredential.user.uid), {
                email: email,
                displayName: displayName,
                role: 'admin',
                createdAt: serverTimestamp(),
                isActive: true
            });

            return userCredential.user;
        } catch (error) {
            let errorMessage = 'حدث خطأ في إنشاء المستخدم';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'البريد الإلكتروني مستخدم بالفعل';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'كلمة المرور ضعيفة (6 أحرف على الأقل)';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'البريد الإلكتروني غير صالح';
                    break;
            }
            
            throw new Error(errorMessage);
        }
    }

    static onAuthStateChange(callback) {
        return onAuthStateChanged(auth, callback);
    }

    static getCurrentUser() {
        return auth.currentUser;
    }
}

// ============ دوال البيانات الرئيسية ============
export async function initFirebase() {
    console.log("✅ Firebase initialized successfully");
    
    // تحميل البيانات المخزنة محلياً أولاً لسرعة الاستجابة
    try {
        const cachedData = localStorage.getItem('mustafa_cache_loaded');
        if (!cachedData) {
            loadInitialCache();
        }
    } catch (e) {
        console.log("⚠️ Could not load cache");
    }
    
    return { db, auth };
}

// تحميل بيانات أولية في الكاش
function loadInitialCache() {
    const initialData = {
        offers: [
            {
                id: "cache_1",
                text: "🎉 خصومات تصل إلى 30% على جميع قطع الغيار! اتصل بنا للحصول على أفضل الأسعار.",
                active: true,
                category: "discount",
                timestamp: new Date().toISOString()
            }
        ],
        visits: { total: 1, daily: {} },
        lastUpdated: new Date().toISOString()
    };
    
    try {
        localStorage.setItem('mustafa_offers_cache', JSON.stringify({
            data: initialData.offers,
            timestamp: new Date().toISOString()
        }));
        
        localStorage.setItem('mustafa_visits_local', JSON.stringify(initialData.visits));
        localStorage.setItem('mustafa_cache_loaded', 'true');
        
        console.log("✅ Initial cache loaded");
    } catch (e) {
        console.log("⚠️ Could not save initial cache");
    }
}

// ============ إدارة الزيارات ============
export async function incrementVisit() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // تحديث محلي أولاً لسرعة الاستجابة
        updateLocalVisitCount(today);
        
        // محاولة تحديث Firebase (قد يفشل بدون اتصال)
        try {
            const statsRef = doc(db, "visits", "counter");
            await setDoc(statsRef, { 
                count: increment(1),
                [`daily.${today}`]: increment(1),
                lastVisit: serverTimestamp(),
                lastUpdated: serverTimestamp()
            }, { merge: true });
            
            console.log("✅ Visit updated in Firebase");
            
            // إذا نجح Firebase، جلب العدد الحقيقي
            const snap = await getDoc(statsRef);
            if (snap.exists()) {
                const count = snap.data().count || 0;
                updateVisitDisplay(count);
                return count;
            }
            
        } catch (firebaseError) {
            console.log("⚠️ Could not update Firebase, using local data");
            // استمر باستخدام البيانات المحلية
        }
        
        // استخدام البيانات المحلية
        const localData = getLocalVisitCount();
        updateVisitDisplay(localData.total);
        return localData.total;
        
    } catch (error) {
        console.error("❌ Error in incrementVisit:", error);
        updateVisitDisplay(1);
        return 1;
    }
}

// تحديث العداد محلياً
function updateLocalVisitCount(date) {
    try {
        const stored = localStorage.getItem('mustafa_visits_local');
        let localData = stored ? JSON.parse(stored) : { total: 0, daily: {} };
        
        localData.total = (localData.total || 0) + 1;
        localData.daily[date] = (localData.daily[date] || 0) + 1;
        localData.lastUpdated = new Date().toISOString();
        
        localStorage.setItem('mustafa_visits_local', JSON.stringify(localData));
        
        // جدولة مزامنة مع Firebase
        scheduleSync('visits', localData);
        
    } catch (localError) {
        console.error("❌ Local storage error:", localError);
    }
}

// الحصول على العدد المحلي
function getLocalVisitCount() {
    try {
        const stored = localStorage.getItem('mustafa_visits_local');
        return stored ? JSON.parse(stored) : { total: 1, daily: {} };
    } catch (e) {
        return { total: 1, daily: {} };
    }
}

// تحديث العرض
function updateVisitDisplay(count) {
    const visitElement = document.getElementById("visits");
    if (visitElement) {
        visitElement.textContent = count.toLocaleString();
    }
    
    if (window.updateVisitCounter) {
        window.updateVisitCounter(count);
    }
}

// ============ إدارة العروض ============
export function loadOffers(callback) {
    try {
        const q = query(
            collection(db, "offers"), 
            orderBy("timestamp", "desc")
        );
        
        return onSnapshot(q, (snapshot) => {
            const offers = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate() || new Date()
                }))
                .filter(offer => offer.active !== false);
            
            console.log(`📦 Loaded ${offers.length} offers from Firebase`);
            
            // حفظ في الكاش المحلي
            cacheOffers(offers);
            
            // إرسال البيانات
            sendOffersToUI(offers, callback);
            
        }, (error) => {
            console.error("❌ Firebase Error [offers]:", error);
            
            // استخدام البيانات المخزنة محلياً
            const cachedOffers = getCachedOffers();
            
            if (cachedOffers.length > 0) {
                console.log(`📦 Using ${cachedOffers.length} cached offers`);
                sendOffersToUI(cachedOffers, callback);
            } else {
                // استخدام بيانات افتراضية
                const defaultOffers = getDefaultOffers();
                console.log(`📦 Using ${defaultOffers.length} default offers`);
                sendOffersToUI(defaultOffers, callback);
            }
        });
    } catch (error) {
        console.error("❌ Error setting up offers listener:", error);
        const defaultOffers = getDefaultOffers();
        sendOffersToUI(defaultOffers, callback);
    }
}

// تخزين العروض في الكاش
function cacheOffers(offers) {
    try {
        localStorage.setItem('mustafa_offers_cache', JSON.stringify({
            data: offers,
            timestamp: new Date().toISOString()
        }));
    } catch (e) {
        console.log("⚠️ Could not cache offers");
    }
}

// جلب العروض من الكاش
function getCachedOffers() {
    try {
        const cached = localStorage.getItem('mustafa_offers_cache');
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            console.log(`📦 Cache from: ${new Date(timestamp).toLocaleString()}`);
            return data || [];
        }
    } catch (e) {
        console.log("⚠️ Could not read cache");
    }
    return [];
}

// بيانات العروض الافتراضية
function getDefaultOffers() {
    return [
        {
            id: "default_1",
            text: "🎉 خصومات تصل إلى 30% على جميع قطع الغيار! اتصل بنا على 0668-343-724",
            active: true,
            category: "discount",
            timestamp: new Date(),
            isDefault: true
        },
        {
            id: "default_2",
            text: "🔧 خدمة توصيل مجانية داخل طنجة للطلبات فوق 500 درهم",
            active: true,
            category: "delivery",
            timestamp: new Date(),
            isDefault: true
        },
        {
            id: "default_3",
            text: "⚡ قطع غيار أصلية بضمان الجودة والسلامة",
            active: true,
            category: "quality",
            timestamp: new Date(),
            isDefault: true
        }
    ];
}

// إرسال العروض إلى الواجهة
function sendOffersToUI(offers, callback) {
    if (typeof callback === 'function') {
        callback(offers);
    }
    
    if (window.loadOffersCallback) {
        window.loadOffersCallback(offers);
    }
}

// إضافة عرض جديد
export async function addOffer(text, options = {}) {
    try {
        const user = auth.currentUser;
        
        const offerData = {
            text: text,
            active: options.active !== undefined ? options.active : true,
            category: options.category || 'general',
            priority: options.priority || 0,
            timestamp: serverTimestamp(),
            createdBy: user ? user.email : 'admin',
            createdAt: new Date().toISOString()
        };
        
        const docRef = await addDoc(collection(db, "offers"), offerData);
        console.log("✅ Offer added with ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("❌ Error adding offer:", error);
        throw new Error('فشل في إضافة العرض: ' + error.message);
    }
}

// حذف/تعطيل عرض
export async function deleteOffer(offerId) {
    try {
        const offerRef = doc(db, "offers", offerId);
        await updateDoc(offerRef, {
            active: false,
            deletedAt: serverTimestamp(),
            deletedBy: auth.currentUser?.email || 'admin'
        });
        
        console.log("✅ Offer deactivated:", offerId);
        return true;
    } catch (error) {
        console.error("❌ Error deleting offer:", error);
        throw new Error('فشل في حذف العرض: ' + error.message);
    }
}

// ============ الإحصائيات والتحليلات ============
export async function getAnalyticsData(days = 7) {
    try {
        const statsRef = doc(db, "visits", "counter");
        const snap = await getDoc(statsRef);
        
        if (!snap.exists()) {
            await setDoc(statsRef, {
                count: 0,
                daily: {},
                createdAt: serverTimestamp()
            });
            
            return getLocalAnalyticsData(days);
        }
        
        const data = snap.data();
        const totalVisits = data.count || 0;
        const dailyData = data.daily || {};
        
        // تحضير بيانات الزيارات اليومية
        const dailyVisits = prepareDailyVisits(dailyData, days);
        
        // جلب عدد العروض النشطة
        const activeOffers = await getActiveOffersCount();
        
        return {
            totalVisits,
            dailyVisits,
            activeOffers,
            lastUpdated: new Date().toISOString(),
            source: 'firebase'
        };
        
    } catch (error) {
        console.error("❌ Error fetching analytics from Firebase:", error);
        return getLocalAnalyticsData(days);
    }
}

// الحصول على إحصائيات محلية
function getLocalAnalyticsData(days = 7) {
    try {
        const localData = getLocalVisitCount();
        const dailyVisits = prepareDailyVisits(localData.daily, days);
        
        // جلب العروض من الكاش
        const cachedOffers = getCachedOffers();
        const activeOffers = cachedOffers.filter(o => o.active !== false).length;
        
        return {
            totalVisits: localData.total || 1,
            dailyVisits,
            activeOffers,
            lastUpdated: localData.lastUpdated || new Date().toISOString(),
            source: 'local'
        };
    } catch (e) {
        console.log("⚠️ Error getting local analytics");
        return getFallbackAnalyticsData(days);
    }
}

// إحصائيات افتراضية
function getFallbackAnalyticsData(days) {
    const dailyVisits = [];
    const now = new Date();
    let total = 0;
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const count = Math.floor(Math.random() * 20) + 5;
        total += count;
        
        dailyVisits.push({
            date: dateStr,
            count: count
        });
    }
    
    return {
        totalVisits: total,
        dailyVisits,
        activeOffers: 3,
        lastUpdated: new Date().toISOString(),
        source: 'fallback'
    };
}

// تحضير بيانات يومية
function prepareDailyVisits(dailyData, days) {
    const dailyVisits = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const count = dailyData[dateStr] || 0;
        
        dailyVisits.push({
            date: dateStr,
            count: count
        });
    }
    
    return dailyVisits;
}

// عدد العروض النشطة
async function getActiveOffersCount() {
    try {
        const offersQuery = query(
            collection(db, "offers"),
            orderBy("timestamp", "desc")
        );
        const offersSnapshot = await getDocs(offersQuery);
        return offersSnapshot.docs.filter(doc => doc.data().active).length;
    } catch (e) {
        console.log("⚠️ Could not fetch offers count from Firebase");
        const cached = getCachedOffers();
        return cached.filter(o => o.active !== false).length;
    }
}

// ============ QR Code ============
export async function getQRSettings() {
    try {
        const docRef = doc(db, "settings", "qr");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            return data.url || "https://piecemustafa.com";
        }
        
        // إعدادات افتراضية
        const defaultSettings = {
            url: "https://piecemustafa.com",
            createdAt: serverTimestamp()
        };
        
        await setDoc(docRef, defaultSettings);
        return defaultSettings.url;
        
    } catch (error) {
        console.error("❌ Error fetching QR settings:", error);
        return "https://piecemustafa.com";
    }
}

export async function loadQR() {
    try {
        const siteUrl = await getQRSettings();
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(siteUrl)}`;
        
        // حفظ في الكاش
        localStorage.setItem('mustafa_qr_url', qrImageUrl);
        
        if (window.updateQRCode) {
            window.updateQRCode(qrImageUrl);
        }
        
        console.log("✅ QR Code Loaded for:", siteUrl);
        return qrImageUrl;
    } catch (error) {
        console.error("❌ Error loading QR:", error);
        
        // استخدام QR افتراضي
        const defaultQR = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://piecemustafa.com";
        
        if (window.updateQRCode) {
            window.updateQRCode(defaultQR);
        }
        
        return defaultQR;
    }
}

export async function updateQRLink(newUrl) {
    try {
        const docRef = doc(db, "settings", "qr");
        await setDoc(docRef, {
            url: newUrl,
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser?.email || 'admin'
        }, { merge: true });
        
        console.log("✅ QR link updated:", newUrl);
        return true;
    } catch (error) {
        console.error("❌ Error updating QR link:", error);
        throw new Error('فشل في تحديث رابط QR');
    }
}

// ============ تصدير البيانات ============
export async function exportDataAsCSV(type = 'visits') {
    try {
        let csvContent = "data:text/csv;charset=utf-8,";
        
        if (type === 'visits') {
            const data = await getAnalyticsData(365);
            csvContent += "التاريخ,عدد الزيارات\n";
            data.dailyVisits.forEach(day => {
                csvContent += `${day.date},${day.count}\n`;
            });
        } else if (type === 'offers') {
            const q = query(collection(db, "offers"), orderBy("timestamp", "desc"));
            const snapshot = await getDocs(q);
            csvContent += "النص,الحالة,الفئة,الأولوية,تاريخ الإنشاء\n";
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                csvContent += `"${data.text}",${data.active ? 'نشط' : 'غير نشط'},${data.category || 'عام'},${data.priority || 0},${data.timestamp?.toDate().toLocaleDateString('ar-SA') || ''}\n`;
            });
        }
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `mustafa_${type}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return true;
    } catch (error) {
        console.error("❌ Error exporting data:", error);
        throw new Error('فشل في تصدير البيانات');
    }
}

// ============ مزامنة البيانات ============
async function scheduleSync(type, data) {
    // تأخير المزامنة لتقليل الحمل
    setTimeout(async () => {
        try {
            if (type === 'visits') {
                await syncVisitData(data);
            }
        } catch (error) {
            console.log(`⚠️ Could not sync ${type} data:`, error);
        }
    }, 5000); // 5 ثواني تأخير
}

async function syncVisitData(localData) {
    try {
        const statsRef = doc(db, "visits", "counter");
        const firebaseSnap = await getDoc(statsRef);
        const firebaseData = firebaseSnap.exists() ? firebaseSnap.data() : { count: 0, daily: {} };
        
        const updates = {
            count: (firebaseData.count || 0) + (localData.total || 0),
            lastSynced: serverTimestamp(),
            syncCount: increment(1)
        };
        
        // تحديث القيم اليومية
        for (const [date, count] of Object.entries(localData.daily || {})) {
            updates[`daily.${date}`] = increment(count || 0);
        }
        
        await setDoc(statsRef, updates, { merge: true });
        
        console.log("✅ Local visits data synced to Firebase");
        
        // مسح البيانات المحلية بعد المزامنة الناجحة
        localStorage.removeItem('mustafa_visits_local');
        
    } catch (error) {
        console.log("⚠️ Could not sync visit data:", error);
    }
}

// ============ دوال مساعدة ============
class FirebaseUtils {
    static formatDate(date) {
        if (!date) return '--';
        const d = date instanceof Date ? date : date.toDate();
        return d.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    static formatTime(date) {
        if (!date) return '--';
        const d = date instanceof Date ? date : date.toDate();
        return d.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static clearCache() {
        try {
            localStorage.removeItem('mustafa_offers_cache');
            localStorage.removeItem('mustafa_visits_local');
            localStorage.removeItem('mustafa_qr_url');
            localStorage.removeItem('mustafa_cache_loaded');
            console.log("✅ Firebase cache cleared");
        } catch (e) {
            console.log("⚠️ Could not clear cache");
        }
    }

    static async backupData() {
        try {
            const backup = {
                timestamp: new Date().toISOString(),
                data: {}
            };
            
            // نسخ العروض
            const offersSnapshot = await getDocs(collection(db, "offers"));
            backup.data.offers = offersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // نسخ الإحصائيات
            const visitsSnapshot = await getDoc(doc(db, "visits", "counter"));
            if (visitsSnapshot.exists()) {
                backup.data.visits = visitsSnapshot.data();
            }
            
            // حفظ محلياً
            const backupStr = JSON.stringify(backup, null, 2);
            const blob = new Blob([backupStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `mustafa_backup_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
            
            console.log("✅ Backup created successfully");
            return backup;
        } catch (error) {
            console.error("❌ Error creating backup:", error);
            throw error;
        }
    }

    static getConnectionStatus() {
        return navigator.onLine ? 'online' : 'offline';
    }

    static async checkFirebaseConnection() {
        try {
            const testRef = doc(db, "visits", "counter");
            await getDoc(testRef);
            return true;
        } catch (error) {
            return false;
        }
    }
}

// ============ إحصائيات التثبيت ============
export async function trackInstall() {
    try {
        const statsRef = doc(db, "stats", "installs");
        await setDoc(statsRef, {
            installs: increment(1),
            lastInstall: serverTimestamp(),
            installDate: new Date().toISOString(),
            userAgent: navigator.userAgent.substring(0, 100),
            platform: navigator.platform,
            isPWA: window.matchMedia('(display-mode: standalone)').matches
        }, { merge: true });
        
        console.log('✅ Install tracked in Firebase');
        return true;
    } catch (error) {
        console.error("❌ Error tracking install:", error);
        
        // حفظ محلياً كبديل
        try {
            const localInstalls = parseInt(localStorage.getItem('mustafa_local_installs') || '0');
            localStorage.setItem('mustafa_local_installs', (localInstalls + 1).toString());
            console.log('✅ Install saved locally');
        } catch (e) {
            console.log('⚠️ Could not save install stats');
        }
        
        return false;
    }
}

// ============ التصدير النهائي ============
export { 
    db, 
    auth, 
    AuthManager, 
    FirebaseUtils,
    getDocs,
    collection,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    increment,
    writeBatch
};
// ============ إحصائيات التثبيت ============

/**
 * تتبع تثبيت التطبيق
 */
export async function trackPWAInstall() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const statsRef = doc(db, "installs", "counter");
        
        // تحديث Firebase
        await setDoc(statsRef, { 
            total: increment(1),
            [`daily.${today}`]: increment(1),
            lastInstall: serverTimestamp(),
            deviceInfo: {
                userAgent: navigator.userAgent.substring(0, 200),
                platform: navigator.platform,
                language: navigator.language,
                isPWA: window.matchMedia('(display-mode: standalone)').matches
            }
        }, { merge: true });
        
        console.log('✅ PWA install tracked in Firebase');
        return true;
        
    } catch (error) {
        console.error('❌ Error tracking PWA install:', error);
        
        // حفظ محلي كبديل
        try {
            const localInstalls = JSON.parse(localStorage.getItem('mustafa_pwa_installs') || '{"total":0,"daily":{}}');
            localInstalls.total = (localInstalls.total || 0) + 1;
            localInstalls.daily[today] = (localInstalls.daily[today] || 0) + 1;
            localInstalls.lastInstall = new Date().toISOString();
            
            localStorage.setItem('mustafa_pwa_installs', JSON.stringify(localInstalls));
            console.log('✅ PWA install saved locally');
        } catch (e) {
            console.log('⚠️ Could not save install locally');
        }
        
        return false;
    }
}

/**
 * جلب إحصائيات التثبيت
 */
export async function getInstallStats(days = 30) {
    try {
        const statsRef = doc(db, "installs", "counter");
        const snap = await getDoc(statsRef);
        
        if (!snap.exists()) {
            // إنشاء مستند جديد
            await setDoc(statsRef, {
                total: 0,
                daily: {},
                createdAt: serverTimestamp()
            });
            
            return getLocalInstallStats(days);
        }
        
        const data = snap.data();
        const totalInstalls = data.total || 0;
        const dailyData = data.daily || {};
        
        // تحضير بيانات التثبيت اليومية
        const dailyInstalls = [];
        const now = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const count = dailyData[dateStr] || 0;
            
            dailyInstalls.push({
                date: dateStr,
                count: count,
                percentage: totalInstalls > 0 ? ((count / totalInstalls) * 100).toFixed(1) : 0
            });
        }
        
        // جلب معلومات الأجهزة
        const devices = await getDeviceStats();
        
        return {
            total: totalInstalls,
            daily: dailyInstalls,
            devices: devices,
            lastInstall: data.lastInstall?.toDate?.() || data.lastInstall,
            lastUpdated: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('❌ Error fetching install stats:', error);
        return getLocalInstallStats(days);
    }
}

/**
 * جلب إحصائيات التثبيت المحلية
 */
function getLocalInstallStats(days = 30) {
    try {
        const localData = JSON.parse(localStorage.getItem('mustafa_pwa_installs') || '{"total":0,"daily":{}}');
        const totalInstalls = localData.total || 0;
        const dailyData = localData.daily || {};
        
        const dailyInstalls = [];
        const now = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const count = dailyData[dateStr] || 0;
            
            dailyInstalls.push({
                date: dateStr,
                count: count,
                percentage: totalInstalls > 0 ? ((count / totalInstalls) * 100).toFixed(1) : 0
            });
        }
        
        return {
            total: totalInstalls,
            daily: dailyInstalls,
            devices: { mobile: 0, desktop: 0, unknown: 0 },
            lastInstall: localData.lastInstall,
            lastUpdated: localData.lastUpdated || new Date().toISOString(),
            source: 'local'
        };
    } catch (e) {
        return {
            total: 0,
            daily: [],
            devices: { mobile: 0, desktop: 0, unknown: 0 },
            lastInstall: null,
            lastUpdated: new Date().toISOString(),
            source: 'error'
        };
    }
}

/**
 * جلب إحصائيات الأجهزة
 */
async function getDeviceStats() {
    try {
        const q = query(collection(db, "installs", "counter", "devices"));
        const snapshot = await getDocs(q);
        
        const devices = {
            mobile: 0,
            desktop: 0,
            unknown: 0
        };
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.userAgent?.includes('Mobile')) {
                devices.mobile++;
            } else if (data.userAgent?.includes('Windows') || data.userAgent?.includes('Mac') || data.userAgent?.includes('Linux')) {
                devices.desktop++;
            } else {
                devices.unknown++;
            }
        });
        
        return devices;
        
    } catch (error) {
        console.log('⚠️ Could not fetch device stats');
        return { mobile: 0, desktop: 0, unknown: 0 };
    }
}

/**
 * مزامنة التثبيتات المحلية مع Firebase
 */
export async function syncLocalInstalls() {
    try {
        const localData = localStorage.getItem('mustafa_pwa_installs');
        if (!localData) return;
        
        const parsed = JSON.parse(localData);
        const statsRef = doc(db, "installs", "counter");
        
        // الحصول على البيانات الحالية
        const firebaseSnap = await getDoc(statsRef);
        const firebaseData = firebaseSnap.exists() ? firebaseSnap.data() : { total: 0, daily: {} };
        
        // تحديث الإجمالي
        const updates = {
            total: (firebaseData.total || 0) + (parsed.total || 0),
            lastSynced: serverTimestamp()
        };
        
        // تحديث القيم اليومية
        for (const [date, count] of Object.entries(parsed.daily || {})) {
            updates[`daily.${date}`] = increment(count || 0);
        }
        
        await setDoc(statsRef, updates, { merge: true });
        
        console.log('✅ Local installs synced to Firebase');
        localStorage.removeItem('mustafa_pwa_installs');
        
    } catch (error) {
        console.log('⚠️ Could not sync local installs:', error);
    }
}