/* MICS service worker: keeps the app opening offline. Your data is in your Google account (or this phone), not here. */
var CACHE = 'mics-v3';
var SHELL = ['./', 'index.html', 'manifest.webmanifest', 'firebase-config.js', 'icon-180.png', 'icon-192.png', 'icon-512.png', '7111095.png', 'pro2.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(SHELL.map(function (u) { return c.add(new Request(u, { cache: 'reload' })).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var same = url.origin === location.origin;

  /* Our own files: network first so updates arrive, saved copy when offline. */
  if (same) {
    e.respondWith(
      fetch(req, { cache: 'no-store' }).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req.mode === 'navigate' ? 'index.html' : req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(req.mode === 'navigate' ? 'index.html' : req).then(function (hit) { return hit || caches.match('index.html'); });
      })
    );
    return;
  }

  /* Firebase sign-in/database code from Google: saved copy first so the app starts offline. */
  if (url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') === 0) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (res) {
          if (res && (res.status === 200 || res.type === 'opaque')) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copy); });
          }
          return res;
        });
      })
    );
  }
});
