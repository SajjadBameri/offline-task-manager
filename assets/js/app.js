/* ============================================================
   یادداشت‌یار - فایل اصلی برنامه
   ============================================================ */

/* ---------- گرفتن المان‌ها ---------- */
const load = document.getElementById("lode");
const display = document.getElementById("display");
const titleTaskinput = document.getElementById("titletask");
const titledisinput = document.getElementById("taskDiscript");
const taskDeadlineInput = document.getElementById("taskDeadline");
const formTitle = document.getElementById("form-title");
const formIcon = document.getElementById("form-icon");
const submitText = document.getElementById("submit-text");
const create2 = document.getElementById("create2");
const cancelForm = document.getElementById("cancelForm");
const ask = document.getElementById("ask");
const adduserback = document.getElementById("addblur");
const fabAdd = document.getElementById("fabAdd");
const from = document.getElementById("from");
const searchInput = document.getElementById("search");
const switchCheckDefault = document.getElementById("switchCheckDefault");
const switchCheckDarken = document.getElementById("switchCheckDarken");
const nodeleted = document.getElementById("nodeleted");
const yasdelete = document.getElementById("yasdelete");
const enableNotifBtn = document.getElementById("enableNotif");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const toastContainer = document.getElementById("toast-container");

/* ---------- وضعیت ---------- */
let db = null;
let currentSearchTerm = "";
let showOnlyCompleted = false;
let editingTaskId = null;
let selectedDeadline = null;
let notifiedTasks = new Set();
let pendingDeleteId = null;
let datepickerReady = false;
let loaderHidden = false;
let activeFilter = "all";
let swRegistration = null;   // 👈 نگه‌داری Service Worker
let notifTimers = new Map(); // 👈 تایمرهای فعال برای هر تسک

/* ============================================================
   لودر
   ============================================================ */
function hideLoader() {
  if (loaderHidden || !load) return;
  loaderHidden = true;
  try {
    load.style.transition = "opacity 0.4s ease";
    load.style.opacity = "0";
    load.style.pointerEvents = "none";
    setTimeout(() => {
      load.style.display = "none";
      load.classList.add("dis-hide");
    }, 450);
  } catch (e) {
    load.style.display = "none";
  }
}

window.addEventListener("load", () => setTimeout(hideLoader, 500));
if (document.readyState === "complete" || document.readyState === "interactive") {
  setTimeout(hideLoader, 800);
} else {
  document.addEventListener("DOMContentLoaded", () => setTimeout(hideLoader, 800));
}
setTimeout(hideLoader, 2500);
window.addEventListener("error", hideLoader);

/* ============================================================
   ثبت Service Worker
   ============================================================ */
async function registerSW() {
  if (!("serviceWorker" in navigator)) {
    console.warn("⚠️ Service Worker پشتیبانی نمی‌شه");
    return;
  }

  try {
    swRegistration = await navigator.serviceWorker.register("./service-worker.js");
    console.log("✅ SW registered:", swRegistration.scope);

    // درخواست Periodic Background Sync
    if ("periodicSync" in swRegistration) {
      try {
        const status = await navigator.permissions.query({ name: "periodic-background-sync" });
        if (status.state === "granted") {
          await swRegistration.periodicSync.register("deadline-check", {
            minInterval: 24 * 60 * 60 * 1000, // ۲۴ ساعت
          });
          console.log("✅ Periodic sync registered");
        }
      } catch (err) {
        console.warn("Periodic sync not available:", err);
      }
    }

    // گوش دادن به پیام‌های SW
    navigator.serviceWorker.addEventListener("message", handleSWMessage);

  } catch (err) {
    console.warn("⚠️ SW registration failed:", err);
  }
}

/* ---------- پیام‌های از SW ---------- */
function handleSWMessage(event) {
  const data = event.data || {};
  console.log("📨 Message from SW:", data);

  if (data.type === "MARK_DONE" && data.taskId != null) {
    updateTaskStatus(data.taskId, true);
    showToast("✅ تسک انجام شد", "success");
    cancelNotifTimer(data.taskId);
  }
}

/* ============================================================
   تقویم شمسی
   ============================================================ */
function tryInitDatepicker() {
  if (datepickerReady) return true;
  if (typeof jQuery === "undefined") return false;
  if (!jQuery.fn || !jQuery.fn.persianDatepicker) return false;

  try {
    jQuery("#taskDeadline").persianDatepicker({
      format: "YYYY/MM/DD HH:mm",
      initialValue: false,
      autoClose: true,
      persianDigit: true,
      observer: true,
      calendar: {
        persian: { locale: "fa", showHint: true, leapYearMode: "algorithmic" },
      },
      timePicker: {
        enabled: true,
        meridiem: { enabled: false },
        second: { enabled: false },
        minute: { enabled: true, step: 1 },
        hour: { enabled: true },
      },
      toolbox: {
        calendarSwitch: { enabled: false },
        todayButton: { enabled: true, text: { fa: "امروز" } },
        submitButton: { enabled: true, text: { fa: "تأیید" } },
      },
      onSelect: function (unix) {
        selectedDeadline = new Date(unix);
      },
    });
    datepickerReady = true;
    return true;
  } catch (e) {
    console.warn("⚠️ Datepicker init failed:", e);
    return false;
  }
}

let dpAttempts = 0;
const dpInterval = setInterval(() => {
  dpAttempts++;
  if (tryInitDatepicker() || dpAttempts > 15) clearInterval(dpInterval);
}, 300);

/* ============================================================
   تم تاریک
   ============================================================ */
try {
  switchCheckDarken?.addEventListener("click", () => {
    document.body.classList.toggle("dark-background");
    const icon = switchCheckDarken.querySelector("i");
    if (!icon) return;
    if (document.body.classList.contains("dark-background")) {
      icon.classList.remove("bi-moon-stars");
      icon.classList.add("bi-sun");
    } else {
      icon.classList.remove("bi-sun");
      icon.classList.add("bi-moon-stars");
    }
  });
} catch (e) { console.warn(e); }

/* ============================================================
   توابع تاریخ
   ============================================================ */
function formatPersianDate(date) {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric", month: "2-digit", day: "2-digit",
    }).format(date);
  } catch (e) { return date.toLocaleDateString("fa-IR"); }
}

function formatPersianTime(date) {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(date);
  } catch (e) { return date.toLocaleTimeString("fa-IR"); }
}

function formatPersianDateTime(date) {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(date);
  } catch (e) { return date.toString(); }
}

function dateToPersianInput(date) {
  if (typeof persianDate === "undefined") return "";
  try {
    const pd = new persianDate(new Date(date));
    const pad = (n) => String(n).padStart(2, "0");
    return `${pd.year()}/${pad(pd.month())}/${pad(pd.date())} ${pad(pd.hour())}:${pad(pd.minute())}`;
  } catch (e) { return ""; }
}

function timeUntil(targetDate) {
  const now = new Date();
  const diff = targetDate - now;
  const absDiff = Math.abs(diff);
  const minutes = Math.floor(absDiff / 60000);
  const hours = Math.floor(absDiff / 3600000);
  const days = Math.floor(absDiff / 86400000);

  let text;
  if (minutes < 60) text = `${minutes} دقیقه`;
  else if (hours < 24) text = `${hours} ساعت`;
  else text = `${days} روز`;

  return diff >= 0 ? `${text} دیگر` : `${text} گذشته`;
}

function getDeadlineStatus(deadline) {
  if (!deadline) return null;
  const now = new Date();
  const diff = deadline - now;
  const hours = diff / 3600000;
  if (diff < 0) return "overdue";
  if (hours < 24) return "urgent";
  if (hours < 72) return "soon";
  return "normal";
}

/* ============================================================
   IndexedDB
   ============================================================ */
function openDatabase() {
  try {
    const request = window.indexedDB.open("To do", 4);

    request.onerror = (e) => {
      console.error("❌ DB Failed", e);
      showToast("خطا در باز کردن دیتابیس", "danger");
      hideLoader();
    };

    request.onblocked = () => console.warn("⚠️ DB blocked");

    request.onsuccess = () => {
      console.log("✅ DB Opened");
      db = request.result;
      try {
        displayData();
        // 👈 چک کردن نوتیف‌های از دست رفته
        setTimeout(checkMissedNotifications, 1500);
        // 👈 زمان‌بندی تایمرهای ددلاین
        setTimeout(scheduleAllDeadlineTimers, 2000);
      } catch (e) { console.error("displayData error:", e); }
    };

    request.onupgradeneeded = (e) => {
      const dbLocal = e.target.result;
      let store;

      if (!dbLocal.objectStoreNames.contains("To do")) {
        store = dbLocal.createObjectStore("To do", {
          keyPath: "id", autoIncrement: true,
        });
        store.createIndex("Title", "Title", { unique: false });
        store.createIndex("Body", "Body", { unique: false });
        store.createIndex("completed", "completed", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("deadline", "deadline", { unique: false });
      } else {
        store = e.currentTarget.transaction.objectStore("To do");
        if (!store.indexNames.contains("completed"))
          store.createIndex("completed", "completed", { unique: false });
        if (!store.indexNames.contains("createdAt"))
          store.createIndex("createdAt", "createdAt", { unique: false });
        if (!store.indexNames.contains("deadline"))
          store.createIndex("deadline", "deadline", { unique: false });
      }
    };
  } catch (e) {
    console.error("openDatabase failed:", e);
    hideLoader();
  }
}

/* ============================================================
   CRUD
   ============================================================ */
function addData(callback) {
  if (!db) { showToast("دیتابیس آماده نیست", "danger"); return; }
  try {
    const newItem = {
      Title: titleTaskinput.value.trim(),
      Body: titledisinput.value.trim(),
      completed: false,
      createdAt: new Date(),
      deadline: selectedDeadline || null,
      lastNotificationAt: null, // 👈 برای پیگیری نوتیف‌ها
    };

    const tx = db.transaction(["To do"], "readwrite");
    const req = tx.objectStore("To do").add(newItem);
    req.onsuccess = () => {
      const newId = req.result;
      // 👈 زمان‌بندی نوتیف برای تسک جدید
      if (newItem.deadline && !newItem.completed) {
        scheduleDeadlineTimer(newId, new Date(newItem.deadline), newItem.Title);
      }
    };
    tx.oncomplete = () => { callback?.(); displayData(); };
    tx.onerror = () => showToast("خطا در ذخیره یادداشت", "danger");
  } catch (e) {
    console.error("addData error:", e);
    showToast("خطا در ذخیره یادداشت", "danger");
  }
}

function updateTask(id, updates, callback) {
  if (!db) return;
  try {
    const tx = db.transaction(["To do"], "readwrite");
    const store = tx.objectStore("To do");
    const req = store.get(id);

    req.onsuccess = () => {
      const data = req.result;
      if (!data) return;
      Object.assign(data, updates);
      store.put(data);
      tx.oncomplete = () => {
        // 👈 آپدیت تایمر
        if (data.completed) {
          cancelNotifTimer(id);
        } else if (data.deadline) {
          scheduleDeadlineTimer(id, new Date(data.deadline), data.Title);
        }
        callback?.();
        displayData();
      };
    };
  } catch (e) {
    console.error("updateTask error:", e);
  }
}

function updateTaskStatus(id, completed) {
  updateTask(id, { completed }, () => {
    if (showOnlyCompleted) displayData();
    // 👈 اگه انجام شد، تایمرش کنسل بشه
    if (completed) cancelNotifTimer(id);
  });
}

function deleteData(id) {
  if (!db) return;
  try {
    const tx = db.transaction(["To do"], "readwrite");
    tx.objectStore("To do").delete(id);
    tx.oncomplete = () => {
      cancelNotifTimer(id); // 👈 کنسل کردن تایمر
      displayData();
    };
  } catch (e) {
    console.error("deleteData error:", e);
  }
}

function getAllTasks() {
  return new Promise((resolve) => {
    if (!db) return resolve([]);
    try {
      const tx = db.transaction(["To do"], "readonly");
      const req = tx.objectStore("To do").getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch (e) { resolve([]); }
  });
}

/* ============================================================
   فیلتر
   ============================================================ */
function searchTasks(term) {
  currentSearchTerm = term.toLowerCase().trim();
  displayData();
}

function toggleCompletedTasks() {
  showOnlyCompleted = !showOnlyCompleted;
  if (showOnlyCompleted) activeFilter = "done";
  else if (activeFilter === "done") activeFilter = "all";
  updateActiveCard();
  displayData();
}

function setFilter(filter) {
  if (!["all", "done", "urgent"].includes(filter)) return;
  if (activeFilter === filter && !(filter === "done" && !showOnlyCompleted)) {
    if (filter === "done" && !showOnlyCompleted) {
      showOnlyCompleted = true;
      if (switchCheckDefault) switchCheckDefault.checked = true;
      displayData();
    }
    return;
  }

  activeFilter = filter;

  if (filter === "done") {
    showOnlyCompleted = true;
    if (switchCheckDefault) switchCheckDefault.checked = true;
  } else {
    showOnlyCompleted = false;
    if (switchCheckDefault) switchCheckDefault.checked = false;
  }

  updateActiveCard();
  displayData();
}

function updateActiveCard() {
  document.querySelectorAll(".stat-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.filter === activeFilter);
  });
}

/* ============================================================
   رندر
   ============================================================ */
function displayData() {
  if (!db || !from) return;

  try {
    while (from.firstChild) from.removeChild(from.firstChild);

    const tx = db.transaction(["To do"], "readonly");
    const req = tx.objectStore("To do").index("createdAt").openCursor(null, "prev");

    let totalCount = 0;
    let totalDone = 0;
    let totalUrgent = 0;
    let visibleCount = 0;

    req.onsuccess = (e) => {
      const cursor = e.target.result;

      if (!cursor) {
        updateStats(totalCount, totalDone, totalUrgent);

        if (visibleCount === 0) {
          if (currentSearchTerm) showNoResultsMessage();
          else if (activeFilter === "done" || showOnlyCompleted) showNoCompletedTasksMessage();
          else if (activeFilter === "urgent") showNoUrgentTasksMessage();
          else checkEmptyTasks();
        }

        updateCount(visibleCount, totalCount);
        return;
      }

      const value = cursor.value;
      const title = (value.Title || "").trim();
      const description = (value.Body || "").trim();
      const completed = value.completed || false;
      const taskId = value.id;
      const createdAt = value.createdAt ? new Date(value.createdAt) : new Date();
      const deadline = value.deadline ? new Date(value.deadline) : null;

      if (title !== "") {
        totalCount++;
        if (completed) totalDone++;
        if (deadline && !completed) {
          const st = getDeadlineStatus(deadline);
          if (st === "urgent" || st === "overdue") totalUrgent++;
        }
      }

      if (title === "") { cursor.continue(); return; }
      if (showOnlyCompleted && !completed) { cursor.continue(); return; }
      if (activeFilter === "done" && !completed) { cursor.continue(); return; }

      if (activeFilter === "urgent") {
        if (completed) { cursor.continue(); return; }
        if (!deadline) { cursor.continue(); return; }
        const st = getDeadlineStatus(deadline);
        if (st !== "urgent" && st !== "overdue") { cursor.continue(); return; }
      }

      if (currentSearchTerm) {
        const tMatch = title.toLowerCase().includes(currentSearchTerm);
        const dMatch = description.toLowerCase().includes(currentSearchTerm);
        if (!tMatch && !dMatch) { cursor.continue(); return; }
      }

      visibleCount++;

      try {
        from.appendChild(buildTaskElement({
          taskId, title, description, completed, createdAt, deadline
        }));
      } catch (err) { console.error("buildTaskElement error:", err); }

      cursor.continue();
    };
  } catch (e) {
    console.error("displayData error:", e);
  }
}

/* ============================================================
   ساخت کارت یادداشت
   ============================================================ */
function buildTaskElement({ taskId, title, description, completed, createdAt, deadline }) {
  const task = document.createElement("div");
  task.className = "task";
  task.dataset.id = taskId;

  const deadlineStatus = deadline ? getDeadlineStatus(deadline) : null;
  if (completed) task.classList.add("task-completed");
  else if (deadlineStatus === "overdue") task.classList.add("priority-overdue");
  else if (deadlineStatus === "urgent") task.classList.add("priority-urgent");

  const header = document.createElement("div");
  header.className = "task-header";

  const titleEl = document.createElement("div");
  titleEl.className = "task-title";
  if (currentSearchTerm && title.toLowerCase().includes(currentSearchTerm)) {
    const safe = currentSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${safe})`, "gi");
    titleEl.innerHTML = title.replace(re, '<span class="bg-warning px-1 rounded">$1</span>');
  } else {
    titleEl.textContent = title;
  }
  if (completed) titleEl.style.textDecoration = "line-through";

  header.appendChild(titleEl);

  if (deadline) {
    const badge = document.createElement("span");
    badge.className = "task-badge";

    if (completed) {
      badge.classList.add("badge-done");
      badge.innerHTML = `<i class="bi bi-check2"></i> انجام شد`;
    } else if (deadlineStatus === "overdue") {
      badge.classList.add("badge-overdue");
      badge.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> ${timeUntil(deadline)}`;
    } else if (deadlineStatus === "urgent") {
      badge.classList.add("badge-urgent");
      badge.innerHTML = `<i class="bi bi-alarm-fill"></i> ${timeUntil(deadline)}`;
    } else if (deadlineStatus === "soon") {
      badge.classList.add("badge-soon");
      badge.innerHTML = `<i class="bi bi-clock-fill"></i> ${timeUntil(deadline)}`;
    } else {
      badge.classList.add("badge-normal");
      badge.innerHTML = `<i class="bi bi-clock"></i> ${timeUntil(deadline)}`;
    }
    header.appendChild(badge);
  }

  const descEl = document.createElement("div");
  descEl.className = "task-desc";
  if (description) {
    if (currentSearchTerm && description.toLowerCase().includes(currentSearchTerm)) {
      const safe = currentSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(${safe})`, "gi");
      descEl.innerHTML = description.replace(re, '<span class="bg-warning px-1 rounded">$1</span>');
    } else {
      descEl.textContent = description;
    }
    if (completed) descEl.style.textDecoration = "line-through";
  } else {
    descEl.textContent = "بدون توضیحات";
    descEl.style.opacity = "0.5";
    descEl.style.fontStyle = "italic";
  }

  const metaEl = document.createElement("div");
  metaEl.className = "task-meta";
  metaEl.innerHTML = `
    <div class="meta-row">
      <i class="bi bi-calendar-plus"></i>
      <span>ساخته شده: ${formatPersianDate(createdAt)} - ${formatPersianTime(createdAt)}</span>
    </div>
    ${deadline ? `
      <div class="meta-row ${deadlineStatus === "overdue" && !completed ? "text-danger fw-bold" : ""}">
        <i class="bi bi-alarm"></i>
        <span>تاریخ تنظیم : ${formatPersianDate(deadline)} - ${formatPersianTime(deadline)}</span>
      </div>
    ` : ""}
  `;

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const doneToggle = document.createElement("label");
  doneToggle.className = "done-toggle";
  doneToggle.innerHTML = `
    <input type="checkbox" ${completed ? "checked" : ""}>
    <span class="check-icon"><i class="bi bi-check-lg"></i></span>
    <span class="${completed ? "text-success fw-bold" : ""}">
      ${completed ? "انجام شده" : "انجام نشده"}
    </span>
  `;

  const checkbox = doneToggle.querySelector("input");
  checkbox.addEventListener("change", () => {
    updateTaskStatus(taskId, checkbox.checked);
  });

  const btnGroup = document.createElement("div");
  btnGroup.className = "btn-group-actions";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "action-btn edit";
  editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
  editBtn.title = "ویرایش";
  editBtn.addEventListener("click", () => openEditForm(taskId));

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "action-btn delete";
  delBtn.innerHTML = '<i class="bi bi-trash3"></i>';
  delBtn.title = "حذف";
  delBtn.addEventListener("click", () => openDeleteConfirm(taskId));

  btnGroup.appendChild(editBtn);
  btnGroup.appendChild(delBtn);

  actions.appendChild(doneToggle);
  actions.appendChild(btnGroup);

  task.appendChild(header);
  task.appendChild(descEl);
  task.appendChild(metaEl);
  task.appendChild(actions);

  return task;
}

/* ============================================================
   فرم
   ============================================================ */
function openCreateForm() {
  resetForm();
  formTitle.textContent = "یادداشت جدید";
  submitText.textContent = "ذخیره";
  formIcon.className = "bi bi-plus-circle";
  display.classList.remove("dis-hide");
  adduserback.classList.remove("dis-hide");
  setTimeout(() => titleTaskinput?.focus(), 100);
}

function openEditForm(id) {
  if (!db) return;
  try {
    const tx = db.transaction(["To do"], "readonly");
    const req = tx.objectStore("To do").get(id);

    req.onsuccess = () => {
      const data = req.result;
      if (!data) return;

      editingTaskId = id;
      titleTaskinput.value = data.Title || "";
      titledisinput.value = data.Body || "";

      if (data.deadline) {
        selectedDeadline = new Date(data.deadline);
        taskDeadlineInput.value = dateToPersianInput(selectedDeadline);
      } else {
        selectedDeadline = null;
        taskDeadlineInput.value = "";
      }

      formTitle.textContent = "ویرایش یادداشت";
      submitText.textContent = "ذخیره";
      formIcon.className = "bi bi-pencil-square";

      display.classList.remove("dis-hide");
      adduserback.classList.remove("dis-hide");
    };
  } catch (e) { console.error("openEditForm error:", e); }
}

function resetForm() {
  editingTaskId = null;
  selectedDeadline = null;
  if (titleTaskinput) titleTaskinput.value = "";
  if (titledisinput) titledisinput.value = "";
  if (taskDeadlineInput) taskDeadlineInput.value = "";
  if (formTitle) formTitle.textContent = "یادداشت جدید";
  if (submitText) submitText.textContent = "ذخیره";
  if (formIcon) formIcon.className = "bi bi-plus-circle";
}

function closeForm() {
  display?.classList.add("dis-hide");
  adduserback?.classList.add("dis-hide");
  resetForm();
}

/* ============================================================
   حذف
   ============================================================ */
function openDeleteConfirm(taskId) {
  pendingDeleteId = taskId;
  ask.classList.remove("dis-hide");
  adduserback.classList.remove("dis-hide");
}

function closeDeleteConfirm() {
  pendingDeleteId = null;
  ask.classList.add("dis-hide");
  adduserback.classList.add("dis-hide");
}

function confirmDelete() {
  if (pendingDeleteId !== null) {
    deleteData(pendingDeleteId);
    showToast("یادداشت حذف شد", "success");
  }
  closeDeleteConfirm();
}

/* ============================================================
   پیام‌های خالی
   ============================================================ */
function showNoResultsMessage() {
  from.innerHTML = `
    <div class="empty-state">
      <h5>نتیجه‌ای یافت نشد</h5>
      <p>هیچ یادداشتی با عبارت «${currentSearchTerm}» پیدا نشد</p>
    </div>
  `;
}

function showNoCompletedTasksMessage() {
  from.innerHTML = `
    <div class="empty-state">
      <h5>یادداشت انجام‌شده‌ای وجود ندارد</h5>
      <p>هنوز هیچ یادداشتی را انجام نداده‌اید</p>
    </div>
  `;
}

function showNoUrgentTasksMessage() {
  from.innerHTML = `
    <div class="empty-state">
      <h5>تسک فوری‌ای وجود ندارد</h5>
      <p>هیچ یادداشتی با وضعیت فوری یا گذشته نیست</p>
    </div>
  `;
}

function checkEmptyTasks() {
  const old = document.getElementById("empty-msg");
  if (old) old.remove();

  setTimeout(() => {
    if (!from) return;
    if (from.querySelector(".task")) return;
    if (from.querySelector(".empty-state")) return;

    const msg = document.createElement("div");
    msg.id = "empty-msg";
    msg.className = "empty-state";
    msg.innerHTML = `
      <h5>هیچ یادداشتی نداری!</h5>
      <p>برای شروع روی دکمه + پایین صفحه کلیک کن</p>
    `;
    from.appendChild(msg);
  }, 100);
}

/* ============================================================
   شمارنده و آمار
   ============================================================ */
function updateCount(visibleCount, totalCount) {
  setTimeout(() => {
    const countEl = document.getElementById("count");
    if (!countEl || !from) return;
    const visible = from.querySelectorAll(".task").length;
    countEl.textContent = visible;
    const noFilter = !currentSearchTerm && !showOnlyCompleted && activeFilter === "all";
    if (noFilter) checkEmptyTasks();
  }, 100);
}

function updateStats(total, done, urgent) {
  const elTotal = document.getElementById("stat-total");
  const elDone = document.getElementById("stat-done");
  const elUrgent = document.getElementById("stat-urgent");
  if (elTotal) elTotal.textContent = total;
  if (elDone) elDone.textContent = done;
  if (elUrgent) elUrgent.textContent = urgent;
}

/* ============================================================
   🆕 سیستم نوتیفیکیشن پیشرفته
   ============================================================ */

/* ---------- زمان‌بندی تایمر برای یه تسک ---------- */
function scheduleDeadlineTimer(taskId, deadline, title) {
  // اگه تایمر قبلی هست، کنسل کن
  cancelNotifTimer(taskId);

  const now = Date.now();
  const deadlineMs = deadline.getTime();
  const diff = deadlineMs - now;

  if (diff <= 0) {
    // موعدش گذشته — همین الان نوتیف بده
    sendDeadlineNotification(taskId, title, true);
    // 👈 و هر ۲۴ ساعت تکرار کن
    startRepeatTimer(taskId, title);
    return;
  }

  // نوتیف اول — سر موعد
  const timer = setTimeout(() => {
    sendDeadlineNotification(taskId, title, false);
    // 👈 بعدش هر ۲۴ ساعت تکرار کن تا تیک بخوره
    startRepeatTimer(taskId, title);
  }, diff);

  notifTimers.set(taskId, timer);
  console.log(`⏰ Timer set for task ${taskId} in ${Math.floor(diff / 60000)} minutes`);
}

/* ---------- تایمر تکرار هر ۲۴ ساعت ---------- */
function startRepeatTimer(taskId, title) {
  // اگه تایمر تکرار قبلی هست، پاکش کن
  const existingKey = "repeat-" + taskId;
  if (notifTimers.has(existingKey)) {
    clearInterval(notifTimers.get(existingKey));
  }

  // هر ۲۴ ساعت نوتیف بده (فقط اگه هنوز انجام نشده)
  const repeatTimer = setInterval(async () => {
    // چک کن تسک هنوز انجام نشده
    const task = await getTaskById(taskId);
    if (!task || task.completed) {
      cancelNotifTimer(taskId);
      return;
    }

    sendDeadlineNotification(taskId, title, true);
    console.log(`🔔 Repeat notification for task ${taskId}`);
  }, 24 * 60 * 60 * 1000); // ۲۴ ساعت

  notifTimers.set(existingKey, repeatTimer);
}

/* ---------- کنسل کردن تایمرها ---------- */
function cancelNotifTimer(taskId) {
  if (notifTimers.has(taskId)) {
    clearTimeout(notifTimers.get(taskId));
    notifTimers.delete(taskId);
  }
  const repeatKey = "repeat-" + taskId;
  if (notifTimers.has(repeatKey)) {
    clearInterval(notifTimers.get(repeatKey));
    notifTimers.delete(repeatKey);
  }
}

/* ---------- گرفتن تسک با ID ---------- */
function getTaskById(id) {
  return new Promise((resolve) => {
    if (!db) return resolve(null);
    try {
      const tx = db.transaction(["To do"], "readonly");
      const req = tx.objectStore("To do").get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch (e) { resolve(null); }
  });
}

/* ---------- ارسال نوتیفیکیشن ددلاین ---------- */
async function sendDeadlineNotification(taskId, title, isOverdue) {
  const notifTitle = isOverdue ? "🔴 موعد تسک رسید!" : "⏰ یادآوری تسک";
  const notifBody = `"${title}" هنوز انجام نشده`;

  // ۱. از طریق Service Worker (بهترین حالت — روی موبایل هم کار می‌کنه)
  if (swRegistration && "showNotification" in swRegistration) {
    try {
      await swRegistration.showNotification(notifTitle, {
        body: notifBody,
        icon: "./assets/img/maskable-512.png",
        badge: "./assets/img/maskable-512.png",
        tag: "task-" + taskId,
        renotify: true,
        requireInteraction: true, // 👈 نوتیف نمی‌ره تا کاربر کلیک کنه
        vibrate: [300, 100, 300, 100, 300], // 👈 مثل پیامک ویبره بزنه
        data: { taskId, url: "./" },
        actions: [
          { action: "done", title: "✅ انجام شد" },
          { action: "snooze", title: "⏰ ۲ ساعت بعد" },
        ],
      });
      console.log("✅ Notification shown via SW");
    } catch (err) {
      console.warn("SW notification failed, fallback:", err);
      sendBasicNotification(notifTitle, notifBody, taskId);
    }
  } else {
    // ۲. فallback — Notification معمولی
    sendBasicNotification(notifTitle, notifBody, taskId);
  }

  // 👈 ثبت زمان آخرین نوتیف
  updateTaskLastNotif(taskId, new Date().toISOString());
}

/* ---------- نوتیفیکیشن ساده (Fallback) ---------- */
function sendBasicNotification(title, body, taskId) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const notif = new Notification(title, {
      body,
      icon: "./assets/img/maskable-512.png",
      badge: "./assets/img/maskable-512.png",
      tag: "task-" + taskId,
      requireInteraction: true,
      vibrate: [300, 100, 300, 100, 300],
    });
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  } catch (e) {
    console.warn("Notification error:", e);
  }
}

/* ---------- آپدیت lastNotificationAt ---------- */
function updateTaskLastNotif(taskId, isoString) {
  if (!db) return;
  try {
    const tx = db.transaction(["To do"], "readwrite");
    const store = tx.objectStore("To do");
    const req = store.get(taskId);
    req.onsuccess = () => {
      const data = req.result;
      if (!data) return;
      data.lastNotificationAt = isoString;
      store.put(data);
    };
  } catch (e) { console.warn("updateTaskLastNotif error:", e); }
}

/* ---------- چک کردن نوتیف‌های از دست رفته ---------- */
async function checkMissedNotifications() {
  const tasks = await getAllTasks();
  const now = Date.now();

  for (const task of tasks) {
    if (task.completed || !task.deadline) continue;

    const deadline = new Date(task.deadline).getTime();
    if (deadline > now) continue; // هنوز نرسیده

    // موعدش گذشته — بذار کاربر ببینه
    const lastNotif = task.lastNotificationAt ? new Date(task.lastNotificationAt).getTime() : 0;
    const hoursSinceLast = (now - lastNotif) / 3600000;

    // اگه ۲۴ ساعت از آخرین نوتیف گذشته یا اصلاً نوتیف نداده
    if (lastNotif === 0 || hoursSinceLast >= 24) {
      // کمی تأخیر بده که اپ کامل لود بشه
      setTimeout(() => {
        sendDeadlineNotification(task.id, task.Title, true);
      }, 1500);
    }
  }
}

/* ---------- زمان‌بندی همه تایمرها در شروع ---------- */
async function scheduleAllDeadlineTimers() {
  const tasks = await getAllTasks();
  for (const task of tasks) {
    if (task.completed || !task.deadline) continue;
    scheduleDeadlineTimer(task.id, new Date(task.deadline), task.Title);
  }
  console.log(`✅ ${notifTimers.size} timers scheduled`);
}

/* ============================================================
   رویدادها
   ============================================================ */
function bindEvents() {
  fabAdd?.addEventListener("click", openCreateForm);
  cancelForm?.addEventListener("click", closeForm);
  nodeleted?.addEventListener("click", closeDeleteConfirm);
  yasdelete?.addEventListener("click", confirmDelete);

  adduserback?.addEventListener("click", () => {
    closeForm();
    closeDeleteConfirm();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeForm();
      closeDeleteConfirm();
    }
  });

  create2?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const title = titleTaskinput?.value.trim() || "";
    if (!title) {
      showToast("عنوان یادداشت را وارد کنید!", "warning");
      titleTaskinput?.focus();
      return;
    }

    if (editingTaskId !== null) {
      updateTask(editingTaskId, {
        Title: title,
        Body: titledisinput.value.trim(),
        deadline: selectedDeadline,
      }, () => {
        closeForm();
        showToast("یادداشت ویرایش شد", "success");
      });
    } else {
      addData(() => {
        closeForm();
        showToast("یادداشت اضافه شد", "success");
      });
    }
  });

  searchInput?.addEventListener("input", function () {
    searchTasks(this.value);
  });

  searchInput?.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      this.value = "";
      currentSearchTerm = "";
      displayData();
    }
  });

  switchCheckDefault?.addEventListener("change", toggleCompletedTasks);

  document.querySelectorAll(".stat-card").forEach((card) => {
    card.addEventListener("click", () => setFilter(card.dataset.filter));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setFilter(card.dataset.filter);
      }
    });
  });

  document.addEventListener("submit", (e) => e.preventDefault());

  // نوتیفیکیشن
  enableNotifBtn?.addEventListener("click", async () => {
    if (!("Notification" in window)) {
      showToast("مرورگر شما از نوتیفیکیشن پشتیبانی نمی‌کند", "warning");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        showToast("نوتیفیکیشن فعال شد ✅", "success");
        enableNotifBtn.classList.add("active");
        enableNotifBtn.querySelector("i").className = "bi bi-bell-fill";

        // 👈 تست نوتیفیکیشن
        setTimeout(() => {
          if (swRegistration) {
            swRegistration.showNotification("🎉 نوتیفیکیشن فعال شد", {
              body: "از این به بعد یادآوری‌ها روی گوشی شما نمایش داده میشه",
              icon: "./assets/img/maskable-512.png",
              vibrate: [200, 100, 200],
              tag: "test",
            });
          }
        }, 1000);

        // 👈 ثبت periodic sync
        if (swRegistration && "periodicSync" in swRegistration) {
          try {
            await swRegistration.periodicSync.register("deadline-check", {
              minInterval: 24 * 60 * 60 * 1000,
            });
            console.log("✅ Periodic sync registered");
          } catch (err) {
            console.warn("Periodic sync failed:", err);
          }
        }
      } else {
        showToast("اجازه نوتیفیکیشن داده نشد", "danger");
      }
    } catch (err) {
      showToast("خطا در فعال‌سازی نوتیفیکیشن", "danger");
    }
  });

  // PDF
  exportPdfBtn?.addEventListener("click", generateInvoicePDF);

  // 👈 وقتی کاربر به اپ برگشت، چک کن نوتیف از دست رفته داشته یا نه
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      console.log("👀 App visible again — checking missed notifications");
      setTimeout(checkMissedNotifications, 1000);
    }
  });
}

/* ============================================================
   Toast
   ============================================================ */
function showToast(message, type = "info") {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `custom-toast ${type}`;
  const icons = {
    success: "check-circle-fill",
    warning: "exclamation-triangle-fill",
    danger: "x-circle-fill",
    info: "info-circle-fill",
  };
  toast.innerHTML = `<i class="bi bi-${icons[type] || "info-circle-fill"}"></i><span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-20px)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* ============================================================
   PDF
   ============================================================ */
let _vazirFontCache = null;

async function getVazirFont() {
  if (_vazirFontCache) return _vazirFontCache;
  const fontUrl = "https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/fonts/ttf/Vazirmatn-Regular.ttf";
  const res = await fetch(fontUrl);
  const buffer = await res.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  _vazirFontCache = btoa(binary);
  return _vazirFontCache;
}

async function generateInvoicePDF() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast("کتابخانه PDF بارگذاری نشده", "danger");
    return;
  }

  showToast("در حال ساخت فاکتور...", "info");

  try {
    const { jsPDF } = window.jspdf;
    const allTasks = await getAllTasks();

    if (!allTasks || allTasks.length === 0) {
      showToast("هیچ یادداشتی برای فاکتور وجود ندارد", "warning");
      return;
    }

    allTasks.sort((a, b) => {
      const da = new Date(a.createdAt || 0);
      const dbb = new Date(b.createdAt || 0);
      return dbb - da;
    });

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    let fontLoaded = false;
    try {
      const fontBase64 = await getVazirFont();
      doc.addFileToVFS("Vazirmatn-Regular.ttf", fontBase64);
      doc.addFont("Vazirmatn-Regular.ttf", "Vazirmatn", "normal");
      doc.setFont("Vazirmatn");
      fontLoaded = true;
    } catch (err) { console.warn("فونت لود نشد", err); }

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentW = pageW - margin * 2;

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageW, 35, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    if (fontLoaded) doc.setFont("Vazirmatn", "normal");
    doc.text("فاکتور یادداشت‌ها", pageW - margin, 15, { align: "right" });

    doc.setFontSize(11);
    doc.text(`تاریخ صدور: ${formatPersianDateTime(new Date())}`, pageW - margin, 25, { align: "right" });

    const invoiceNo = "INV-" + Date.now().toString().slice(-8);
    doc.text(`شماره: ${invoiceNo}`, margin, 25, { align: "left" });

    let y = 45;
    const total = allTasks.length;
    const doneCount = allTasks.filter((t) => t.completed).length;
    const pendingCount = total - doneCount;

    const cardW = (contentW - 8) / 3;
    const cardH = 20;
    const cards = [
      { label: "کل یادداشت‌ها", value: total, color: [37, 99, 235] },
      { label: "انجام شده", value: doneCount, color: [22, 163, 74] },
      { label: "در انتظار", value: pendingCount, color: [245, 158, 11] },
    ];

    cards.forEach((card, i) => {
      const x = pageW - margin - (i + 1) * cardW - i * 4;
      doc.setFillColor(card.color[0], card.color[1], card.color[2]);
      doc.roundedRect(x, y, cardW, cardH, 3, 3, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      if (fontLoaded) doc.setFont("Vazirmatn", "normal");
      doc.text(card.label, x + cardW / 2, y + 7, { align: "center" });

      doc.setFontSize(14);
      doc.text(String(card.value), x + cardW / 2, y + 16, { align: "center" });
    });

    y += cardH + 10;

    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, contentW, 9, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    if (fontLoaded) doc.setFont("Vazirmatn", "normal");

    const colTitleX = pageW - margin - 3;
    const colDeadlineX = pageW - margin - contentW * 0.55;
    const colStatusX = pageW - margin - contentW * 0.85;

    doc.text("عنوان", colTitleX, y + 6, { align: "right" });
    doc.text("ددلاین", colDeadlineX, y + 6, { align: "center" });
    doc.text("وضعیت", colStatusX, y + 6, { align: "center" });

    y += 9;

    const rowH = 8;
    let rowIndex = 0;

    for (const task of allTasks) {
      if (y + rowH > pageH - 25) {
        doc.addPage();
        y = margin;
        doc.setFillColor(30, 41, 59);
        doc.rect(margin, y, contentW, 9, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text("عنوان", colTitleX, y + 6, { align: "right" });
        doc.text("ددلاین", colDeadlineX, y + 6, { align: "center" });
        doc.text("وضعیت", colStatusX, y + 6, { align: "center" });
        y += 9;
      }

      if (rowIndex % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentW, rowH, "F");
      }

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + rowH, pageW - margin, y + rowH);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8);

      let titleTxt = (task.Title || "بدون عنوان").trim();
      if (titleTxt.length > 30) titleTxt = titleTxt.substring(0, 28) + "…";
      doc.text(titleTxt, colTitleX, y + 5.5, { align: "right" });

      let deadlineTxt = "—";
      if (task.deadline) {
        const d = new Date(task.deadline);
        deadlineTxt = `${formatPersianDate(d)} ${formatPersianTime(d)}`;
      }
      doc.text(deadlineTxt, colDeadlineX, y + 5.5, { align: "center" });

      if (task.completed) {
        doc.setTextColor(22, 163, 74);
        doc.text("انجام شده", colStatusX, y + 5.5, { align: "center" });
      } else {
        const status = task.deadline ? getDeadlineStatus(new Date(task.deadline)) : null;
        if (status === "overdue") {
          doc.setTextColor(220, 38, 38);
          doc.text("گذشته", colStatusX, y + 5.5, { align: "center" });
        } else if (status === "urgent") {
          doc.setTextColor(245, 158, 11);
          doc.text("فوری", colStatusX, y + 5.5, { align: "center" });
        } else {
          doc.setTextColor(100, 116, 139);
          doc.text("در انتظار", colStatusX, y + 5.5, { align: "center" });
        }
      }

      y += rowH;
      rowIndex++;
    }

    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageH - 15, pageW - margin, pageH - 15);

      doc.setTextColor(148, 163, 184);
      doc.setFontSize(8);
      if (fontLoaded) doc.setFont("Vazirmatn", "normal");
      doc.text("یادداشت‌یار — فاکتور خودکار", margin, pageH - 9, { align: "left" });
      doc.text(`صفحه ${p} از ${totalPages}`, pageW - margin, pageH - 9, { align: "right" });
    }

    const fileName = `invoice-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
    showToast("فاکتور PDF دانلود شد ✅", "success");
  } catch (err) {
    console.error("PDF error:", err);
    showToast("خطا در ساخت فاکتور", "danger");
  }
}

/* ============================================================
   PWA Install
   ============================================================ */
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
});
window.addEventListener("appinstalled", () => {
  showToast("اپ با موفقیت نصب شد 🎉", "success");
  deferredPrompt = null;
});

/* ============================================================
   Scroll effect روی هدر
   ============================================================ */
function initHeaderScroll() {
  const appHeader = document.getElementById("appHeader");
  if (!appHeader) return;

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (window.scrollY > 20) appHeader.classList.add("scrolled");
        else appHeader.classList.remove("scrolled");
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* ============================================================
   شروع برنامه
   ============================================================ */
function init() {
  console.log("🚀 init() called");

  try { bindEvents(); console.log("✅ Events bound"); }
  catch (e) { console.error("❌ bindEvents failed:", e); }

  try { registerSW(); console.log("✅ SW registration started"); }
  catch (e) { console.error("❌ SW registration failed:", e); }

  try { openDatabase(); console.log("✅ openDatabase called"); }
  catch (e) { console.error("❌ openDatabase failed:", e); hideLoader(); }

  try { initHeaderScroll(); }
  catch (e) { console.error("❌ header scroll failed:", e); }

  updateCount(0, 0);
  checkEmptyTasks();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}