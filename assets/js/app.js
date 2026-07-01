const Rudex = document.getElementById("Rudex");
const spinner = document.getElementById("spinner");
const load = document.getElementById("lode");
const start = document.getElementById("start");
const login = document.getElementById("login");
const nowstart = document.getElementById("nowstart");
const display = document.getElementById("display");
const titleTaskinput = document.getElementById("titletask");
const titledisinput = document.getElementById("taskDiscript");
const create2 = document.getElementById("create2");
const ask = document.getElementById("ask");
const adduserback = document.getElementById("addblur");
const create = document.getElementById("create");
const from = document.getElementById("from");
const searchInput = document.getElementById("search");
const switchCheckDefault = document.getElementById("switchCheckDefault");
const switchCheckDarken = document.getElementById("switchCheckDarken");
const nodeleted = document.getElementById('nodeleted')
nodeleted.addEventListener('click',()=>{


  adduserback.classList.add('dis-hide')
    ask.classList.add('dis-hide')
})
// notask.addEventListener('click',()=>{
  

// }) 
if (display) display.classList.add("dis-hide");
if (load) load.classList.add("dis-hide");
// if (start) start.classList.add('dis-hide');
if (login) login.classList.add("dis-hide");
switchCheckDarken.addEventListener("click", () => {
  document.querySelector("body").classList.toggle("dark-background");
});

// if (nowstart) {
//     nowstart.addEventListener('click', (e) => {
//         e.preventDefault();
//         const loader = document.querySelector('.loader');
//         if (loader) loader.classList.remove('dis-hide');
//         setTimeout(() => {
//             const trantionUp = document.querySelector('.trantion_up');
//             if (trantionUp) trantionUp.classList.add('dis-none');
//         }, 3000);
//         setTimeout(() => {
//             const formSignin = document.querySelector('.form-signin');
//             if (formSignin) formSignin.classList.remove('dis-hide');
//         }, 3000);
//     });
// }

setTimeout(() => {
  if (load) load.classList.remove("dis-hide");
}, 1000);
setTimeout(() => {
  if (load) load.classList.add("dis-hide");
}, 4000);
setTimeout(() => {
  if (start) start.classList.remove("dis-hide");
}, 5000);
setTimeout(() => {
  if (login) login.classList.remove("dis-hide");
}, 4000);

const send = document.getElementById("send");
if (send) {
  send.addEventListener("click", function (e) {
    e.preventDefault();
    const floatingInput =
      document.getElementById("floatingInput")?.value.trim() || "";
    // const floatingPassword = document.getElementById('floatingPassword')?.value.trim() || '';
    const namalog = document.getElementById("namalog");
    if (namalog)
      namalog.innerHTML = ` ${floatingInput}   <img src="/assets/img/User_02.png" width="17px" height="17px">`;

    namalog.addEventListener("click", () => {});

    if (
      floatingInput !== "" &&
      floatingInput.length > 3
    ) // && floatingPassword !== '' && floatingPassword.length >= 6 && /^\d+$/.test(floatingPassword))
    {
      if (spinner) spinner.classList.remove("dis-hide");
      setTimeout(() => {
        if (login) login.classList.add("dis-hide");
      }, 2000);
      setTimeout(() => {
        if (load) load.classList.remove("dis-hide");
      }, 2000);
      setTimeout(() => {
        if (load) load.classList.add("dis-hide");
      }, 4000);
      setTimeout(() => {
        if (Rudex) Rudex.classList.remove("dis-hide");
        checkEmptyTasks();
      }, 4000);
    } else {
      alert("Error!!");
    }
  });
}

let db;
let currentSearchTerm = "";
let showOnlyCompleted = false;

function formatPersianDateTime(date) {
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };

  try {
    return new Intl.DateTimeFormat("fa-IR", options).format(date);
  } catch(e) {
    return date
      .toLocaleString("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(/,/g, " - ");
  }
}

function formatPersianDate(date) {
  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };

  try {
    return new Intl.DateTimeFormat("fa-IR", options).format(date);
  } catch (e) {
    return date.toLocaleDateString("fa-IR");
  }
}

function formatPersianTime(date) {
  const options = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };

  try {
    return new Intl.DateTimeFormat("fa-IR", options).format(date);
  } catch (e) {
    return date.toLocaleTimeString("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
}

window.onload = () => {
  let request = window.indexedDB.open("To do", 3);

  request.onerror = () => {
    console.log("DataBase Failed to Open");
  };

  request.onsuccess = () => {
    console.log("DataBase Opened Successfully");
    db = request.result;
    displayData();
  };

  request.onupgradeneeded = (e) => {
    let db = e.target.result;
    let objectStore;

    if (!db.objectStoreNames.contains("To do")) {
      objectStore = db.createObjectStore("To do", {
        keyPath: "id",
        autoIncrement: true,
      });
      objectStore.createIndex("Title", "Title", { unique: false });
      objectStore.createIndex("Body", "Body", { unique: false });
      objectStore.createIndex("completed", "completed", { unique: false });
      objectStore.createIndex("createdAt", "createdAt", { unique: false });
      console.log("DataBase setup Successfully");
    } else {
      objectStore = e.currentTarget.transaction.objectStore("To do");

      if (!objectStore.indexNames.contains("completed")) {
        objectStore.createIndex("completed", "completed", { unique: false });
      }
      if (!objectStore.indexNames.contains("createdAt")) {
        objectStore.createIndex("createdAt", "createdAt", { unique: false });
      }
    }
  };
};

const addData = (e, callback) => {
  if (e && e.preventDefault) {
    e.preventDefault();
  }

  let newitem = {
    Title: titleTaskinput.value,
    Body: titledisinput.value,
    completed: false,
    createdAt: new Date(),
  };

  let transaction = db.transaction(["To do"], "readwrite");
  let objectStore = transaction.objectStore("To do");
  let request = objectStore.add(newitem);

  request.onsuccess = () => {
    if (titleTaskinput) titleTaskinput.value = "";
    if (titledisinput) titledisinput.value = "";
    console.log("Item added to DB");
  };

  transaction.oncomplete = () => {
    console.log("Transaction Completed On Database");
    if (callback) callback();
    displayData();
  };

  transaction.onerror = () => {
    console.log("Error Transaction on Database");
  };
};

const updateTaskStatus = (id, completed) => {
  let transaction = db.transaction(["To do"], "readwrite");
  let objectStore = transaction.objectStore("To do");
  let request = objectStore.get(id);

  request.onsuccess = () => {
    let data = request.result;
    if (data) {
      data.completed = completed;
      let updateRequest = objectStore.put(data);

      updateRequest.onsuccess = () => {
        console.log("Task status updated");
        if (showOnlyCompleted) {
          displayData();
        }
      };
    }
  };
};

const deleteData = (id) => {
  let transaction = db.transaction(["To do"], "readwrite");
  let objectStore = transaction.objectStore("To do");
  let request = objectStore.delete(id);

  request.onsuccess = () => {
    console.log("Item deleted from DB");
  };

  transaction.oncomplete = () => {
    displayData();
  };
};

function searchTasks(searchTerm) {
  currentSearchTerm = searchTerm.toLowerCase().trim();
  displayData();
}

function toggleCompletedTasks() {
  showOnlyCompleted = !showOnlyCompleted;

  if (switchCheckDefault) {
    if (showOnlyCompleted) {
      switchCheckDefault.classList.add("active", "btn-success");
      switchCheckDefault.classList.remove("btn-outline-secondary");
      switchCheckDefault.innerHTML =
        '<i class="bi bi-check-circle-fill"></i> All Display';
    } else {
      switchCheckDefault.classList.remove("active", "btn-success");
      switchCheckDefault.classList.add("btn-outline-secondary");
      switchCheckDefault.innerHTML =
        '<i class="bi bi-check-circle"></i> فقط انجام شده‌ها';
    }
  }

  displayData();
}

function displayData() {
  while (from.firstChild) {
    from.removeChild(from.firstChild);
  }

  let transaction = db.transaction(["To do"], "readonly");
  let objectStore = transaction.objectStore("To do");

  let request = objectStore.index("createdAt").openCursor(null, "prev");

  let hasResults = false;
  let completedTasksCount = 0;
  let totalTasksCount = 0;

  request.onsuccess = (e) => {
    let cursor = e.target.result;
    if (cursor) {
      const title = cursor.value.Title.trim();
      const discription = cursor.value.Body.trim();
      const completed = cursor.value.completed || false;
      const taskId = cursor.value.id;
      const createdAt = cursor.value.createdAt
        ? new Date(cursor.value.createdAt)
        : new Date();

      totalTasksCount++;

      if (title === "") {
        cursor.continue();
        return;
      }

      if (showOnlyCompleted && !completed) {
        cursor.continue();
        return;
      }

      if (currentSearchTerm !== "") {
        const titleMatch = title.toLowerCase().includes(currentSearchTerm);
        const descMatch = discription.toLowerCase().includes(currentSearchTerm);

        if (!titleMatch && !descMatch) {
          cursor.continue();
          return;
        }
      }

      hasResults = true;
      if (completed) completedTasksCount++;

      const task = document.createElement("div");
      task.className =
        "task border rounded-5 p-4  mb-3 bg-transparent shadow-sm ";
      task.setAttribute("data-id", taskId);

      const titleEl = document.createElement("h5");
      titleEl.className = "mb-2 fw-bold bg-blue-75";

      if (
        currentSearchTerm !== "" &&
        title.toLowerCase().includes(currentSearchTerm)
      ) {
        const regex = new RegExp(`(${currentSearchTerm})`, "gi");
        const highlightedTitle = title.replace(
          regex,
          '<span class="bg-warning  px-1 rounded">$1</span>',
        );
        titleEl.innerHTML = highlightedTitle;
      } else {
        titleEl.textContent = title;
      }

      const descEl = document.createElement("p");
      descEl.className = "text-secondary small mb-3";

      if (
        currentSearchTerm !== "" &&
        discription.toLowerCase().includes(currentSearchTerm)
      ) {
        const regex = new RegExp(`(${currentSearchTerm})`, "gi");
        const highlightedDesc = discription.replace(
          regex,
          '<span class="bg-warning  px-1 rounded">$1</span>',
        );
        descEl.innerHTML = highlightedDesc;
      } else {
        descEl.textContent = discription || "بدون توضیح";
      }

      const dateTimeContainer = document.createElement("div");
      dateTimeContainer.className = "datetime-container mb-3";

      const dateEl = document.createElement("small");
      dateEl.className = "text-muted d-flex align-items-center gap-2";

      const calendarIcon = document.createElement("i");
      calendarIcon.className = "bi bi-calendar3";

      const dateText = document.createElement("span");
      dateText.textContent = formatPersianDate(createdAt);

      const clockIcon = document.createElement("i");
      clockIcon.className = "bi bi-clock ms-3";

      const timeText = document.createElement("span");
      timeText.textContent = formatPersianTime(createdAt);

      dateEl.appendChild(calendarIcon);
      dateEl.appendChild(dateText);
      dateEl.appendChild(clockIcon);
      dateEl.appendChild(timeText);
      dateTimeContainer.appendChild(dateEl);

      dateEl.title = formatPersianDateTime(createdAt);

      const actionsRow = document.createElement("div");
      actionsRow.className =
        "d-flex align-items-center justify-content-start gap-4 text-secondary fs-5";

      const doneWrapper = document.createElement("div");
      doneWrapper.className = "d-flex align-items-center gap-2 cursor-pointer";

  const checkbox = document.createElement("input");
     checkbox.type = "checkbox";
    checkbox.className = "form-check-input m-0";
    checkbox.id = "done" + taskId;
    checkbox.checked = completed;

      const doneIcon = document.createElement("label");
      doneIcon.setAttribute("for", checkbox.id);
      doneIcon.className = "m-0";


      if (completed) {
        doneIcon.innerHTML =
          '<i class="bi bi-check-circle-fill text-success"></i>';
      } else {
        doneIcon.innerHTML = '<i class="bi bi-circle"></i>';
      }

      const doneText = document.createElement("span");
      doneText.className =
        "fs-6 " + (completed ? "text-success" : "text-muted");
      doneText.textContent = completed ? "انجام شده" : "انجام نشده";

      if (completed) {
        titleEl.classList.add("text-decoration-line-through", "text-muted");
        descEl.classList.add("text-decoration-line-through", "text-muted");
        dateEl.classList.add("text-decoration-line-through");
      }

      checkbox.addEventListener("change", () => {
        const isChecked = checkbox.checked;

        if (isChecked) {
          titleEl.classList.add("text-decoration-line-through", "text-muted");
          descEl.classList.add("text-decoration-line-through", "text-muted");
          dateEl.classList.add("text-decoration-line-through");
          doneIcon.innerHTML =
            '<i class="bi bi-check-circle-fill text-success"></i>';
          doneText.textContent = "انجام شده";
          checkbox.textContent = "انجام شده";
          doneText.classList.remove("text-muted");
          doneText.classList.add("text-success");
        } else {
          titleEl.classList.remove(
            "text-decoration-line-through",
            "text-muted",
          );
          descEl.classList.remove("text-decoration-line-through", "text-muted");
          dateEl.classList.remove("text-decoration-line-through");
          doneIcon.innerHTML = '<i class="bi bi-circle"></i>';
          doneText.textContent = "انجام نشده";
          doneText.classList.remove("text-success");
          doneText.classList.add("text-muted");
        }

        updateTaskStatus(taskId, isChecked);
      });

      const delWrapper = document.createElement("div");
      delWrapper.className = "d-flex align-items-center gap-2";

      const delBtn = document.createElement("button");
      delBtn.className = "btn  p-0";
      delBtn.innerHTML = '<img src="/assets/icon/Trash_Empty.png" alt="" class=" w-25">';
      delBtn.type = "button";

      const delText = document.createElement("span");
      delText.className = "fs-6 text-danger";
      // delText.textContent = "حذف";

      delBtn.addEventListener("click", () => {
        if (ask) ask.classList.remove("dis-hide");
        if (adduserback) adduserback.classList.remove("dis-hide");

        const yasdelete = document.getElementById("yasdelete");
        if (yasdelete) {
          const newYasdelete = yasdelete.cloneNode(true);
          yasdelete.parentNode.replaceChild(newYasdelete, yasdelete);

          newYasdelete.addEventListener("click", () => {
            if (ask) ask.classList.add("dis-hide");
            if (adduserback) adduserback.classList.add("dis-hide");
            deleteData(taskId);
          });
        }
      });

      doneWrapper.appendChild(checkbox);
      doneWrapper.appendChild(doneIcon);
      doneWrapper.appendChild(doneText);

      delWrapper.appendChild(delBtn);
      delWrapper.appendChild(delText);

      actionsRow.appendChild(doneWrapper);
      actionsRow.appendChild(delWrapper);

      task.appendChild(titleEl);
      task.appendChild(descEl);
      task.appendChild(dateTimeContainer);
      task.appendChild(actionsRow);
      from.appendChild(task);

      cursor.continue();
    } else {
      if (showOnlyCompleted && completedTasksCount === 0) {
        showNoCompletedTasksMessage();
      } else if (currentSearchTerm !== "" && !hasResults) {
        showNoResultsMessage();
      } else if (totalTasksCount === 0) {
        checkEmptyTasks();
      } else if (showOnlyCompleted && hasResults) {
        showCompletedTasksMessage(completedTasksCount);
      }

      updateCount(hasResults, completedTasksCount, totalTasksCount);
    }
  };
}

function showNoResultsMessage() {
  const msg = document.createElement("div");
  msg.id = "no-results-msg";
  msg.className = "text-center py-5 text-muted";
  msg.innerHTML = `
        <i class="bi bi-search display-1 d-block mb-4 opacity-50"></i>
        <h3>نتیجه‌ای یافت نشد</h3>
        <p class="lead">هیچ تسکی با عبارت "${currentSearchTerm}" یافت نشد</p>
        <button id="clearSearch" class="btn btn-outline-secondary mt-3">پاک کردن جستجو</button>
    `;
  from.appendChild(msg);

  const clearSearchBtn = document.getElementById("clearSearch");
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      currentSearchTerm = "";
      displayData();
    });
  }
}

function showNoCompletedTasksMessage() {
  const msg = document.createElement("div");
  msg.id = "no-completed-msg";
  msg.className = "text-center py-5 text-muted";
  msg.innerHTML = `
        <i class="bi bi-check-circle display-1 d-block mb-4 opacity-50"></i>
        <h3>تسک انجام شده‌ای وجود ندارد</h3>
        <p class="lead">Still notask into title "Doing" NotSign</p>
        <button id="showAllTasks" class="btn btn-outline-primary mt-3">ShowAllTask</button>
    `;
  from.appendChild(msg);

  const showAllBtn = document.getElementById("showAllTasks");
  if (showAllBtn) {
    showAllBtn.addEventListener("click", () => {
      toggleCompletedTasks();
    });
  }
}

function showCompletedTasksMessage(count) {
  const msg = document.createElement("div");
  msg.id = "completed-info-msg";
  msg.className = "alert alert-info text-center mb-3";
  msg.innerHTML = `
        <i class="bi bi-info-circle me-2"></i>
  Curentlly Show ${count}  Task
        <button id="showAllFromInfo" class="btn btn-sm btn-outline-info ms-3">نمایش همه</button>
    `;
  from.insertBefore(msg, from.firstChild);

  const showAllBtn = document.getElementById("showAllFromInfo");
  if (showAllBtn) {
    showAllBtn.addEventListener("click", () => {
      toggleCompletedTasks();
    });
  }
}

if (create) {
  create.addEventListener("click", (e) => {
    e.preventDefault();
    if (display) display.classList.remove("dis-hide");
    const add = document.querySelector(".add");
    if (add) add.classList.add("wide");
    const addUserBack = document.querySelector(".add-user-back");
    if (addUserBack) addUserBack.classList.remove("dis-hide");
  });
}

if (adduserback) {
  adduserback.addEventListener("click", () => {
    if (ask) ask.classList.add("dis-hide");
    if (display) display.classList.add("dis-hide");
    const add = document.querySelector(".add");
    if (add) add.classList.remove("wide");
    const addUserBack = document.querySelector(".add-user-back");
    if (addUserBack) addUserBack.classList.add("dis-hide");
  });
}

if (create2) {
  create2.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const title = titleTaskinput?.value.trim() || "";
    if (title === "") {
      alert("Please choose one works!");
      return;
    }

    addData(e, () => {
      if (display) display.classList.add("dis-hide");
      const add = document.querySelector(".add");
      if (add) add.classList.remove("wide");
      const addUserBack = document.querySelector(".add-user-back");
      if (addUserBack) addUserBack.classList.add("dis-hide");
      const keytype = document.getElementById("type");
      if (keytype) keytype.classList.remove("dis-hide");
      if (Rudex) Rudex.classList.add("dis-hide");

      setTimeout(() => {
        if (keytype) keytype.classList.add("dis-hide");
        if (Rudex) Rudex.classList.remove("dis-hide");
      }, 4000);
    });
  });
}

if (searchInput) {
  searchInput.addEventListener("input", function (e) {
    searchTasks(this.value);
  });

  searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      this.value = "";
      currentSearchTerm = "";
      displayData();
    }
  });
}

if (switchCheckDefault) {
  switchCheckDefault.addEventListener("click", toggleCompletedTasks);
  switchCheckDefault.innerHTML =
    '<i class="bi bi-check-circle"></i> فقط انجام شده‌ها';
  switchCheckDefault.type = "button";
}

function checkEmptyTasks() {
  const old = document.getElementById("empty-msg");
  if (old) old.remove();

  setTimeout(() => {
    if (from.querySelector(".task")) return;

    const msg = document.createElement("div");
    msg.id = "empty-msg";
    msg.className = "text-center py-5 text-muted";
    msg.innerHTML = `
            <i class="bi bi-clipboard2-check display-1 d-block mb-4 opacity-50"></i>
            <h3>هیچ تسکی تعریف نشده است</h3>
            <p class="lead">برای شروع روی دکمه + کلیک کنید</p>
        `;
    from.appendChild(msg);
  }, 100);
}

function updateCount(hasResults = true, completedCount = 0, totalCount = 0) {
  setTimeout(() => {
    const countEl = document.getElementById("count");
    if (countEl) {
      if (showOnlyCompleted) {
        countEl.textContent = `${completedCount} Do Task`;
        countEl.classList.add("text-success");
        countEl.classList.remove("text-warning", "text-danger");
      } else if (currentSearchTerm !== "" && hasResults) {
        const taskCount = from.querySelectorAll(".task").length;
        countEl.textContent = `${taskCount} نتیجه یافت شد`;
        countEl.classList.add("text-warning");
        countEl.classList.remove("text-success", "text-danger");
      } else if (currentSearchTerm !== "" && !hasResults) {
        countEl.textContent = "۰ نتیجه یافت شد";
        countEl.classList.add("text-danger");
        countEl.classList.remove("text-warning", "text-success");
      } else {
        const taskCount = from.querySelectorAll(".task").length;
        countEl.textContent = taskCount;
        countEl.classList.remove("text-warning", "text-danger", "text-success");
      }
    }

    if (currentSearchTerm === "" && !showOnlyCompleted){
      checkEmptyTasks();
    }
  }, 100);
}

document.addEventListener("submit", function (e) {
  e.preventDefault();
});

document.addEventListener("DOMContentLoaded", function () {
  const yasdelete = document.getElementById("yasdelete");
  const nodelete = document.getElementById("nodelete");

  if (yasdelete) {
    yasdelete.type = "button";
  }

  if (nodelete) {
    nodelete.addEventListener("click", function () {
      if (ask) ask.classList.add("dis-hide");
      if (adduserback) adduserback.classList.add("dis-hide");
    });
  }

  if (searchInput) {
    const searchContainer = searchInput.parentElement;
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "btn btn-sm btn-outline-secondary position-absolute";
    clearBtn.style.left = "10px";
    clearBtn.style.top = "50%";
    clearBtn.style.transform = "translateY(-50%)";
    clearBtn.innerHTML = '<i class="bi bi-x-lg"></i>';
    clearBtn.title = "پاک کردن جستجو";
    clearBtn.style.display = "none";

    clearBtn.addEventListener("click", function () {
      searchInput.value = "";
      currentSearchTerm = "";
      displayData();
      searchInput.focus();
    });

    searchContainer.style.position = "relative";
    searchContainer.appendChild(clearBtn);

    searchInput.addEventListener("input", function () {
      if (this.value.trim() !== "") {
        clearBtn.style.display = "block";
      } else {
        clearBtn.style.display = "none";
      }
    });
  }

  if (switchCheckDefault) {
    switchCheckDefault.classList.add("btn", "btn-outline-secondary");
  }

  const style = document.createElement("style");
  style.textContent = `
        .datetime-container {
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding-top: 10px;
        }
        .task:hover .datetime-container {
            border-top-color: rgba(255, 255, 255, 0.2);
        }
        .bi-calendar3, .bi-clock {
            font-size: 0.9em;
            opacity: 0.7;
        }
        .task.completed .datetime-container {
            opacity: 0.6;
        }
    `;
  document.head.appendChild(style);
});

updateCount();
checkEmptyTasks();