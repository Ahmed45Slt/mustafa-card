const CACHE_NAME = 'mustafa-parts-v2'; // تغيير الإصدار لتحديث الكاش تلقائياً

// مصفوفة الملفات مع استخدام مسارات نسبية صحيحة
const ASSETS = [
  './',
  './index.html',
  './admin.html',
  './privacy.html',
  './manifest.json',
  './firebase.js',
  './push.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// التثبيت
self.addEventListener('install', (event) => {
  self.skipWaiting(); // إجبار النسخة الجديدة على التفعيل فوراً
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('✅ Caching Assets');
      return cache.addAll(ASSETS).catch(err => console.log('❌ Cache error:', err));
    })
  );
});

// التفعيل وتنظيف الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// جلب البيانات
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    }).catch(() => {
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
