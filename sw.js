/* LABMAT SMK XI service worker — offline-first app shell (revisi v2) */
const CACHE = 'labmat-smk-xi-v5';
const SHELL = [
  './', './index.html', './student.html', './teacher.html', './manifest.json',
  './css/styles.css', './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './js/app.js', './js/utils.js', './js/database.js', './js/auth.js', './js/ui.js',
  './js/learning.js', './js/guided-practice.js', './js/quiz.js', './js/scoring.js',
  './js/sync.js', './js/analytics.js', './js/challenges.js', './js/flow.js',
  './js/timing.js', './js/anomaly.js', './js/realtime.js', './js/feedback.js',
  './js/essay.js', './js/notebook.js',
  './data/materials.js', './data/questions.js', './data/practice.js', './data/rubrics.js',
  './data/challenges.js', './data/essays.js', './data/notebook.js',
  './teacher/dashboard.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => {
      // Server mati/proxy mengembalikan 5xx → sajikan halaman dari cache.
      if (!r || !r.ok || r.status >= 500) {
        return caches.match(e.request).then(cached => cached || caches.match('./student.html') || r);
      }
      const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./student.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => {
    const update = fetch(e.request).then(r => {
      if (r && r.ok) caches.open(CACHE).then(c => c.put(e.request, r.clone()));
      return r;
    }).catch(() => hit);
    return hit || update;
  }));
});
