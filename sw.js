/* Service Worker — منظومة الموارد البشرية (PWA)
   - شبكة أولاً للصفحة والبيانات (عشان أي تعديل يظهر فوراً للجميع)
   - كاش للملفات الثابتة (أيقونات/مكتبات) لفتح أسرع وعمل بدون نت جزئياً
*/
const CACHE = 'hr-portal-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // لا تتدخل أبداً في طلبات Supabase / أي API — شبكة مباشرة دائماً
  if (/supabase|\/rest\/|\/auth\/|\/realtime\//i.test(url.href)) return;

  // التنقّل (فتح الصفحة): شبكة أولاً ثم الكاش عند انقطاع النت
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(()=>{});
        return res;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // باقي الطلبات: كاش أولاً ثم الشبكة (للملفات الثابتة والمكتبات)
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (res && res.status === 200 && (url.origin === location.origin || /cdnjs|jsdelivr|unpkg|gstatic|googleapis/i.test(url.href))) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
      }
      return res;
    }).catch(() => cached))
  );
});
