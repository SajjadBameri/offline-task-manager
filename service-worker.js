/* ============================================================
   Service Worker — یادداشت‌یار
   ============================================================ */

const CACHE_NAME = "yaddashyar-v3";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./assets/css/style.css",
  "./assets/js/app.js",
  "./assets/img/maskable-512.png",
  "./manifest.json"
];

/* ---------- نصب ---------- */
self.addEventListener("install", (event) => {
  console.log("📦 SW: Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("Cache addAll partial fail:", err);
      });
    })
  );
  self.skipWaiting();
});

/* ---------- فعال‌سازی ---------- */
self.addEventListener("activate", (event) => {
  console.log("⚡ SW: Activating...");
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

/* ---------- Fetch (کش) ---------- */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (!req.url.startsWith("http")) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

/* ============================================================
   Push Notification
   ============================================================ */
self.addEventListener("push", (event) => {
  console.log("📬 SW: Push received");

  let data = { title: "یادداشت‌یار", body: "یادآوری جدید", tag: "default" };
  try {
    if (event.data) data = Object.assign(data, event.data.json());
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  const options = {
    body: data.body,
    icon: "./assets/img/maskable-512.png",
    badge: "./assets/img/maskable-512.png",
    tag: data.tag || "yaddashyar-" + Date.now(),
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || "./",
      taskId: data.taskId || null,
    },
    actions: [
      { action: "done", title: "✅ انجام شد" },
      { action: "snooze", title: "⏰ ۲ ساعت بعد" },
      { action: "open", title: "باز کردن" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

/* ============================================================
   کلیک روی نوتیفیکیشن
   ============================================================ */
self.addEventListener("notificationclick", (event) => {
  console.log("🖱️ SW: Notification clicked:", event.action);
  event.notification.close();

  const notifData = event.notification.data || {};
  const taskId = notifData.taskId;

  if (event.action === "done" && taskId) {
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "MARK_DONE", taskId });
        });
        if (clients.length === 0) {
          return self.clients.openWindow("./?action=done&taskId=" + taskId);
        }
      })
    );
    return;
  }

  if (event.action === "snooze" && taskId) {
    event.waitUntil(scheduleLocalNotification(
      "⏰ یادآوری مجدد",
      "این تسک هنوز انجام نشده",
      taskId,
      2 * 60 * 60 * 1000
    ));
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow("./");
    })
  );
});

self.addEventListener("notificationclose", (event) => {
  console.log("❌ SW: Notification closed");
});

/* ============================================================
   Periodic Background Sync
   ============================================================ */
self.addEventListener("periodicsync", (event) => {
  console.log("🔄 SW: Periodic sync fired:", event.tag);
  if (event.tag === "deadline-check") {
    event.waitUntil(checkDeadlinesFromSW());
  }
});

async function checkDeadlinesFromSW() {
  try {
    const db = await openDBFromSW();
    if (!db) return;

    const tasks = await getAllTasksFromSW(db);
    const now = Date.now();

    for (const task of tasks) {
      if (task.completed || !task.deadline) continue;
      const deadline = new Date(task.deadline).getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        const lastNotif = task.lastNotificationAt ? new Date(task.lastNotificationAt).getTime() : 0;
        const hoursSinceLastNotif = (now - lastNotif) / 3600000;

        if (hoursSinceLastNotif >= 24 || lastNotif === 0) {
          await self.registration.showNotification("🔴 موعد تسک رسید!", {
            body: `"${task.Title}" هنوز انجام نشده`,
            icon: "./assets/img/maskable-512.png",
            badge: "./assets/img/maskable-512.png",
            tag: "task-" + task.id,
            renotify: true,
            requireInteraction: true,
            vibrate: [300, 100, 300, 100, 300],
            data: { taskId: task.id, url: "./" },
            actions: [
              { action: "done", title: "✅ انجام شد" },
              { action: "snooze", title: "⏰ ۲ ساعت بعد" },
            ],
          });

          await updateTaskLastNotifFromSW(db, task.id, new Date().toISOString());
        }
      }
    }
  } catch (e) {
    console.error("SW: checkDeadlines error:", e);
  }
}

function openDBFromSW() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open("To do", 6);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch (e) { resolve(null); }
  });
}

function getAllTasksFromSW(db) {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(["To do"], "readonly");
      const req = tx.objectStore("To do").getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch (e) { resolve([]); }
  });
}

function updateTaskLastNotifFromSW(db, id, isoString) {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(["To do"], "readwrite");
      const store = tx.objectStore("To do");
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const data = getReq.result;
        if (!data) return resolve();
        data.lastNotificationAt = isoString;
        store.put(data);
        tx.oncomplete = () => resolve();
      };
      getReq.onerror = () => resolve();
    } catch (e) { resolve(); }
  });
}

function scheduleLocalNotification(title, body, taskId, delayMs) {
  return new Promise((resolve) => {
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: "./assets/img/maskable-512.png",
        badge: "./assets/img/maskable-512.png",
        tag: "snooze-" + taskId,
        renotify: true,
        requireInteraction: true,
        vibrate: [300, 100, 300],
        data: { taskId, url: "./" },
        actions: [
          { action: "done", title: "✅ انجام شد" },
          { action: "snooze", title: "⏰ ۲ ساعت بعد" },
        ],
      });
      resolve();
    }, delayMs);
  });
}

/* ---------- پیام از کلاینت ---------- */
self.addEventListener("message", (event) => {
  const data = event.data || {};
  console.log("📨 SW: Message received:", data.type);

  if (data.type === "SHOW_NOTIFICATION") {
    self.registration.showNotification(data.title || "یادداشت‌یار", {
      body: data.body || "",
      icon: "./assets/img/maskable-512.png",
      badge: "./assets/img/maskable-512.png",
      tag: data.tag || "task-" + (data.taskId || Date.now()),
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 100, 300, 100, 300],
      data: { taskId: data.taskId, url: "./" },
      actions: [
        { action: "done", title: "✅ انجام شد" },
        { action: "snooze", title: "⏰ ۲ ساعت بعد" },
      ],
    });
  }

  if (data.type === "REGISTER_PERIODIC_SYNC") {
    if ("periodicSync" in self.registration) {
      self.registration.periodicSync
        .register("deadline-check", { minInterval: 24 * 60 * 60 * 1000 })
        .then(() => console.log("✅ Periodic sync registered"))
        .catch((err) => console.warn("Periodic sync failed:", err));
    }
  }
});