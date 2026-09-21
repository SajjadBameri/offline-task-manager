/* ============================================================
   To-Do App - نسخه نهایی با تاریخ شمسی و رابط حرفه‌ای
   ============================================================ */

/* ---------- المان‌ها ---------- */
const load = document.getElementById("lode");
const Rudex = document.getElementById("Rudex");
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
const create = document.getElementById("create");
const from = document.getElementById("from");
const searchInput = document.getElementById("search");
const switchCheckDefault = document.getElementById("switchCheckDefault");
const switchCheckDarken = document.getElementById("switchCheckDarken");
const nodeleted = document.getElementById("nodeleted");
const enableNotifBtn = document.getElementById("enableNotif");
const toastContainer = document.getElementById("toast-container");

/* ---------- وضعیت ---------- */
let db = null;
let currentSearchTerm = "";
let showOnlyCompleted = false;
let editingTaskId = null;
let selectedDeadline = null;
let notifiedTasks = new Set();
let deadlinePicker = null;

/* ============================================================
   لودر - با اطمینان کامل حذف می‌شود
   ============================================================ */
function hideLoader() {
  if (!load) return;
  load.classList.add("fade-out");
  setTimeout(() => {
    load.style.display = "none";
    load.classList.add("dis-hide");
  }, 400);
}

// اگر صفحه سریع لود شد
window.addEventListener("load", () => {
  setTimeout(hideLoader, 1200);
});

// اطمینان: حداکثر بعد از ۳ ثانیه لودر باید برود
setTimeout(hideLoader, 3000);

/* ============================================================
   تقویم شمسی
   ============================================================ */
function initPersianDatepicker() {
  if (typeof jQuery === "undefined") {
    console.warn("jQuery not loaded");
    return;
  }
  if (!jQuery.fn.persianDatepicker) {
    console.warn("Persian datepicker not loaded");
    return;
  }

  deadlinePicker = jQuery("#taskDeadline").persianDatepicker({
    format: "YYYY/MM/DD HH:mm",
    initialValue: false,
    autoClose: true,
    persianDigit: true,
    observer: true,
    calendar: {
      persian: {
        locale: "fa",
        showHint: true,
        leapYearMode: "algorithmic",
      },
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
}

/* ============================================================
   تم تاریک
   ============================================================ */
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

/* ============================================================
   توابع کمکی تاریخ
   ============================================================ */
function formatPersianDateTime(date) {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(date);
  } catch (e) { return date.toLocaleString("fa-IR"); }
}

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

function dateToPersianInput(date) {
  if (typeof persianDate === "undefined") {
    return "";
  }
  const pd = new persianDate(new Date(date));
  const pad = (n) => String(n).padStart(2, "0");
  return `${pd.year()}/${pad(pd.month())}/${pad(pd.date())} ${pad(pd.hour())}:${pad(pd.minute())}`;
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
  const request = window.indexedDB.open("To do", 4);

  request.onerror = () => {
    console.error("❌ DB Failed to Open");
    showToast("خطا در باز کردن دیتابیس", "danger");
    hideLoader();
  };

  request.onsuccess = () => {
    console.log("✅ DB Opened");
    db = request.result;
    displayData();
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
    console.log("✅ DB setup complete");
  };
}

/* ============================================================
   CRUD
   ============================================================ */
function addData(callback) {
  if (!db) { showToast("دیتابیس آماده نیست", "danger"); return; }

  const newItem = {
    Title: titleTaskinput.value.trim(),
    Body: titledisinput.value.trim(),
    completed: false,
    createdAt: new Date(),
    deadline: selectedDeadline || null,
  };

  const tx = db.transaction(["To do"], "readwrite");
  tx.objectStore("To do").add(newItem);

  tx.oncomplete = () => {
    callback?.();
    displayData();
  };

  tx.onerror = () => {
    showToast("خطا در ذخیره تسک", "danger");
  };
}

function updateTask(id, updates, callback) {
  if (!db) return;
  const tx = db.transaction(["To do"], "readwrite");
  const store = tx.objectStore("To do");
  const req = store.get(id);

  req.onsuccess = () => {
    const data = req.result;
    if (!data) return;
    Object.assign(data, updates);
    store.put(data);

    tx.oncomplete = () => {
      callback?.();
      displayData();
    };
  };
}

function updateTaskStatus(id, completed) {
  updateTask(id, { completed }, () => {
    if (showOnlyCompleted) displayData();
  });
}

function deleteData(id) {
  if (!db) return;
  const tx = db.transaction(["To do"], "readwrite");
  tx.objectStore("To do").delete(id);
  tx.oncomplete = () => displayData();
}

/* ============================================================
   رندر
   ============================================================ */
function searchTasks(term) {
  currentSearchTerm = term.toLowerCase().trim();
  displayData();
}

function toggleCompletedTasks() {
  showOnlyCompleted = !showOnlyCompleted;
  displayData();
}

function displayData() {
  if (!db) return;
  while (from.firstChild) from.removeChild(from.firstChild);

  const tx = db.transaction(["To do"], "readonly");
  const req = tx.objectStore("To do").index("createdAt").openCursor(null, "prev");

  let hasResults = false;
  let completedCount = 0;
  let totalCount = 0;
  let urgentCount = 0;

  req.onsuccess = (e) => {
    const cursor = e.target.result;

    if (!cursor) {
      if (showOnlyCompleted && completedCount === 0) showNoCompletedTasksMessage();
      else if (currentSearchTerm && !hasResults) showNoResultsMessage();
      else if (totalCount === 0) checkEmptyTasks();

      updateCount(completedCount, totalCount);
      updateStats(totalCount, completedCount, urgentCount);
      return;
    }

    const value = cursor.value;
    const title = (value.Title || "").trim();
    const description = (value.Body || "").trim();
    const completed = value.completed || false;
    const taskId = value.id;
    const createdAt = value.createdAt ? new Date(value.createdAt) : new Date();
    const deadline = value.deadline ? new Date(value.deadline) : null;

    totalCount++;

    if (deadline && !completed) {
      const status = getDeadlineStatus(deadline);
      if (status === "urgent" || status === "overdue") urgentCount++;
    }

    if (title === "") { cursor.continue(); return; }
    if (showOnlyCompleted && !completed) { cursor.continue(); return; }

    if (currentSearchTerm) {
      const tMatch = title.toLowerCase().includes(currentSearchTerm);
      const dMatch = description.toLowerCase().includes(currentSearchTerm);
      if (!tMatch && !dMatch) { cursor.continue(); return; }
    }

    hasResults = true;
    if (completed) completedCount++;

    from.appendChild(buildTaskElement({
      taskId, title, description, completed, createdAt, deadline
    }));

    cursor.continue();
  };
}

/* ============================================================
   ساخت کارت تسک
   ============================================================ */
function buildTaskElement({ taskId, title, description, completed, createdAt, deadline }) {
  const task = document.createElement("div");
  task.className = "task";
  task.dataset.id = taskId;

  const deadlineStatus = deadline ? getDeadlineStatus(deadline) : null;
  if (completed) task.classList.add("task-completed");
  else if (deadlineStatus === "overdue") task.classList.add("priority-overdue");
  else if (deadlineStatus === "urgent") task.classList.add("priority-urgent");

  // Header
  const header = document.createElement("div");
  header.className = "d-flex justify-content-between align-items-start gap-2 mb-1";

  const titleEl = document.createElement("div");
  titleEl.className = "task-title";
  if (currentSearchTerm && title.toLowerCase().includes(currentSearchTerm)) {
    const re = new RegExp(`(${currentSearchTerm})`, "gi");
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

  // توضیحات
  const descEl = document.createElement("div");
  descEl.className = "task-desc";
  if (description) {
    if (currentSearchTerm && description.toLowerCase().includes(currentSearchTerm)) {
      const re = new RegExp(`(${currentSearchTerm})`, "gi");
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

  // متادیتا
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
        <span>ددلاین: ${formatPersianDate(deadline)} - ${formatPersianTime(deadline)}</span>
      </div>
    ` : ""}
  `;

  // اکشن‌ها
  const actions = document.createElement("div");
  actions.className = "task-actions";

  const doneToggle = document.createElement("label");
  doneToggle.className = "done-toggle";
  doneToggle.innerHTML = `
    <input type="checkbox" ${completed ? "checked" : ""}>
    <span class="check-icon"><i class="bi bi-check-lg"></i></span>
    <span class="${completed ? "text-success fw-bold" : "text-muted"}">
      ${completed ? "انجام شده" : "انجام نشده"}
    </span>
  `;

  const checkbox = doneToggle.querySelector("input");
  checkbox.addEventListener("change", () => {
    updateTaskStatus(taskId, checkbox.checked);
  });

  const btnGroup = document.createElement("div");
  btnGroup.className = "d-flex gap-2";

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
  formTitle.textContent = "ایجاد تسک جدید";
  submitText.textContent = "ایجاد تسک";
  formIcon.className = "bi bi-plus-circle";

  display.classList.remove("dis-hide");
  adduserback.classList.remove("dis-hide");
  setTimeout(() => titleTaskinput?.focus(), 100);
}

function openEditForm(id) {
  if (!db) return;
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

    formTitle.textContent = "ویرایش تسک";
    submitText.textContent = "ذخیره تغییرات";
    formIcon.className = "bi bi-pencil-square";

    display.classList.remove("dis-hide");
    adduserback.classList.remove("dis-hide");
  };
}

function resetForm() {
  editingTaskId = null;
  selectedDeadline = null;
  if (titleTaskinput) titleTaskinput.value = "";
  if (titledisinput) titledisinput.value = "";
  if (taskDeadlineInput) taskDeadlineInput.value = "";
  formTitle.textContent = "ایجاد تسک جدید";
  submitText.textContent = "ایجاد تسک";
  formIcon.className = "bi bi-plus-circle";
}

function closeForm() {
  display?.classList.add("dis-hide");
  adduserback?.classList.add("dis-hide");
  resetForm();
}

/* ============================================================
   تأیید حذف
   ============================================================ */
function openDeleteConfirm(taskId) {
  ask.classList.remove("dis-hide");
  adduserback.classList.remove("dis-hide");

  const yasdelete = document.getElementById("yasdelete");
  if (!yasdelete) return;

  const newYes = yasdelete.cloneNode(true);
  yasdelete.parentNode.replaceChild(newYes, yasdelete);

  newYes.addEventListener("click", () => {
    ask.classList.add("dis-hide");
    adduserback.classList.add("dis-hide");
    deleteData(taskId);
    showToast("تسک حذف شد", "success");
  });
}

/* ============================================================
   پیام‌های خالی
   ============================================================ */
function showNoResultsMessage() {
  from.innerHTML = `
    <div class="empty-state">
      <div class="icon"><i class="bi bi-search"></i></div>
      <h5>نتیجه‌ای یافت نشد</h5>
      <p class="text-muted">هیچ تسکی با عبارت "${currentSearchTerm}" یافت نشد</p>
    </div>
  `;
}

function showNoCompletedTasksMessage() {
  from.innerHTML = `
    <div class="empty-state">
      <div class="icon"><i class="bi bi-check2-circle"></i></div>
      <h5>تسک انجام شده‌ای وجود ندارد</h5>
      <p class="text-muted">هنوز هیچ تسکی را انجام نداده‌اید</p>
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
      <div class="icon"><i class="bi bi-clipboard2-check"></i></div>
      <h5>هیچ تسکی نداری!</h5>
      <p class="text-muted">برای شروع روی دکمه + بالا کلیک کن</p>
    `;
    from.appendChild(msg);
  }, 100);
}

/* ============================================================
   شمارنده و آمار
   ============================================================ */
function updateCount(completedCount, totalCount) {
  setTimeout(() => {
    const countEl = document.getElementById("count");
    if (!countEl) return;

    if (showOnlyCompleted) countEl.textContent = completedCount;
    else if (currentSearchTerm) countEl.textContent = from.querySelectorAll(".task").length;
    else countEl.textContent = totalCount;

    if (!currentSearchTerm && !showOnlyCompleted) checkEmptyTasks();
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
   رویدادها
   ============================================================ */
create?.addEventListener("click", openCreateForm);
adduserback?.addEventListener("click", closeForm);
cancelForm?.addEventListener("click", closeForm);
nodeleted?.addEventListener("click", closeForm);

create2?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();

  const title = titleTaskinput?.value.trim() || "";
  if (!title) {
    showToast("عنوان تسک را وارد کنید!", "warning");
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
      showToast("تسک با موفقیت ویرایش شد", "success");
    });
  } else {
    addData(() => {
      closeForm();
      showToast("تسک جدید اضافه شد", "success");
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

document.addEventListener("submit", (e) => e.preventDefault());

/* ============================================================
   نوتیفیکیشن
   ============================================================ */
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
    } else {
      showToast("اجازه نوتیفیکیشن داده نشد", "danger");
    }
  } catch (err) {
    showToast("خطا در فعال‌سازی نوتیفیکیشن", "danger");
  }
});

function sendNotification(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try { new Notification(title, { body }); } catch (e) {}
  }
}

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
   بررسی ددلاین
   ============================================================ */
function startDeadlineChecker() {
  checkDeadlines();
  setInterval(checkDeadlines, 60000);
}

function checkDeadlines() {
  if (!db) return;
  const tx = db.transaction(["To do"], "readonly");
  const req = tx.objectStore("To do").getAll();

  req.onsuccess = () => {
    const tasks = req.result || [];
    const now = new Date();

    tasks.forEach((task) => {
      if (task.completed || !task.deadline) return;

      const deadline = new Date(task.deadline);
      const diff = deadline - now;
      const taskId = task.id;

      if (diff > 0 && diff < 3600000 && !notifiedTasks.has("soon-" + taskId)) {
        notifiedTasks.add("soon-" + taskId);
        sendNotification("⏰ نزدیک به ددلاین", `"${task.Title}" کمتر از ۱ ساعت دیگر موعدش است`);
        showToast(`⏰ "${task.Title}" نزدیک به ددلاین`, "warning");
      }

      if (diff <= 0 && diff > -60000 && !notifiedTasks.has("now-" + taskId)) {
        notifiedTasks.add("now-" + taskId);
        sendNotification("🔴 ددلاین رسید!", `"${task.Title}" به موعد خود رسید`);
        showToast(`🔴 ددلاین "${task.Title}" رسید!`, "danger");
      }
    });
  };
}

/* ============================================================
   شروع برنامه
   ============================================================ */
function init() {
  openDatabase();

  // تقویم بعد از لود jQuery
  if (window.jQuery) {
    initPersianDatepicker();
  } else {
    window.addEventListener("load", initPersianDatepicker);
  }

  startDeadlineChecker();
  updateCount(0, 0);
  checkEmptyTasks();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}