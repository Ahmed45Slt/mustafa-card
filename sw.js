const CACHE_NAME = 'mustafa-parts-v1';
// قائمة الملفات الموجودة فعلياً في مشروعك
const ASSETS = [
  './',
  './index.html',
  './admin.html',
  './privacy.html',
  './firebase.js',
  './push.js',
  './manifest.json',
  './package.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// تثبيت الـ Service Worker وتخزين الملفات
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ الملفات تم تخزينها بنجاح');
        return cache.addAll(ASSETS);
      })
  );
});

// تفعيل الـ Service Worker وتنظيف الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      );
    })
  );
});

// استراتيجية جلب البيانات (الشبكة أولاً، ثم الكاش في حال انقطاع الإنترنت)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
