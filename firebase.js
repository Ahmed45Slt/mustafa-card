// firebase.js
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
    increment, 
    getDoc,
    setDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// إعدادات Firebase الخاصة بك
const firebaseConfig = {
    apiKey: "AIzaSyDgIpQl4LXSSqPrvfAd8SeaR3UbYKWvEmI",
    authDomain: "mustafa-card.firebaseapp.com",
    projectId: "mustafa-card",
    storageBucket: "mustafa-card.firebasestorage.app",
    messagingSenderId: "1067081939938",
    appId: "1:1067081939938:web:4aed0222e81176180017bb"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * دالة تهيئة Firebase (تستخدم في index.html)
 */
export async function initFirebase() {
    console.log("✅ Firebase initialized successfully");
    return { db };
}

/**
 * تسجيل زيادة عدد الزيارات
 */
export async function incrementVisit() {
    try {
        const statsRef = doc(db, "analytics", "stats");
        await setDoc(statsRef, { 
            totalVisits: increment(1),
            lastVisit: serverTimestamp() 
        }, { merge: true });
        
        const snap = await getDoc(statsRef);
        if (snap.exists()) {
            const count = snap.data().totalVisits;
            const visitElement = document.getElementById("visits");
            if (visitElement) visitElement.innerText = count.toLocaleString();
        }
    } catch (error) {
        console.error("❌ Error incrementing visit:", error);
    }
}

/**
 * جلب العروض الحالية
 * تم إزالة orderBy مؤقتاً لتجنب خطأ الـ Index
 */
export function loadOffers(callback) {
    // ملاحظة: إذا قمت بإنشاء Index في لوحة تحكم Firebase، يمكنك إعادة إضافة orderBy("timestamp", "desc")
    const q = query(collection(db, "offers")); 
    
    return onSnapshot(q, (snapshot) => {
        const offers = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log(`📦 Loaded ${offers.length} offers`);
        
        // إرسال البيانات للكولباك
        if (typeof callback === 'function') callback(offers);
        
        // دعم التوافق مع الكود الموجود مباشرة في index.html
        if (window.loadOffersCallback) {
            window.loadOffersCallback(offers);
        }
    }, (error) => {
        console.error("❌ Firebase Error [offers]:", error);
    });
}

/**
 * جلب بيانات التحليلات (للوحة التحكم)
 */
export async function getAnalyticsData() {
    try {
        const statsRef = doc(db, "analytics", "stats");
        const snap = await getDoc(statsRef);
        return snap.exists() ? snap.data() : { totalVisits: 0 };
    } catch (error) {
        console.error("❌ Error fetching analytics:", error);
        return { totalVisits: 0 };
    }
}

/**
 * تحديث رابط الـ QR Code
 */
export function loadQR() {
    const qrElement = document.getElementById("qr");
    if (qrElement) {
        // يمكنك تغيير هذا الرابط ليكون ديناميكياً من Firestore لاحقاً
        qrElement.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${window.location.origin}`;
    }
}

// تصدير الأدوات الإضافية لاستخدامها في admin.js
export { db };
