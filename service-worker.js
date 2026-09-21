/* ============================================================
   Service Worker - To-Do PWA
   ============================================================ */

const CACHE_VERSION = "todo-v1.0.0";
const CACHE_STATIC = `${CACHE_VERSION}-static`;
const CACHE_DYNAMIC = `${CACHE_VERSION}-dynamic`;

/* فایل‌های ضروری که باید کش شوند */
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",

  // CSS خودتان
  "./assets/css/style.css",
  "./assets/css/util.css",
  "./assets/css/btn.css",

  // Bootstrap
  "./assets/bostrap/dist/css/bootstrap.min.css",
  "./assets/bostrap/dist/js/bootstrap.bundle.min.js",

  // JS
  "./assets/js/app.js",

  // آیکون‌های اپ
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
];

/* ---------- نصب: کش فایل‌های استاتیک ---------- */
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn("[SW] Skipped:", url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

/* ---------- فعال‌سازی: پاک کردن کش‌های قدیمی ---------- */
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_STATIC && key !== CACHE_DYNAMIC)
          .map((key) => {
            console.log("[SW] Deleting old cache:", key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

/* ---------- Fetch: استراتژی ترکیبی ---------- */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // فقط GET
  if (request.method !== "GET") return;

  // درخواست‌های chrome-extension و غیره را نادیده بگیر
  if (!url.protocol.startsWith("http")) return;

  // CDNها (jQuery، persian-datepicker، فونت) → Cache First
  if (
    url.origin !== self.location.origin &&
    (url.hostname.includes("jsdelivr") ||
      url.hostname.includes("code.jquery.com") ||
      url.hostname.includes("fonts.googleapis.com") ||
      url.hostname.includes("fonts.gstatic.com"))
  ) {
    event.respondWith(cacheFirst(request, CACHE_DYNAMIC));
    return;
  }

  // فایل‌های خودی → Stale-While-Revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, CACHE_STATIC));
    return;
  }

  // بقیه → Network First با fallback
  event.respondWith(networkFirst(request, CACHE_DYNAMIC));
});

/* ---------- استراتژی‌ها ---------- */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response("آفلاین هستید", {
      status: 503,
      statusText: "Offline",
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await networkPromise) || new Response("آفلاین", { status: 503 });
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response("آفلاین هستید", { status: 503 });
  }
}

/* ---------- پیام از کلاینت ---------- */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/* ---------- Notification Click ---------- */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("index.html") && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("./index.html");
      }
    })
  );
});