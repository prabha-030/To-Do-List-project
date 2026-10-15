
const $ = (id) => document.getElementById(id);

const taskForm = $("taskForm");
const taskInput = $("taskInput");
const priorityInput = $("priority");
const dueDateInput = $("dueDate");
const reminderInput = $("reminderTime");
const taskList = $("taskList");
const searchInput = $("search");
const themeBtn = $("themeBtn");
const notificationButton = $("enableNotifications");
const notificationStatus = $("notificationStatus");
const clearCompletedBtn = $("clearCompleted");
const summary = $("summary");
const progress = $("progress");

const filterButtons = document.querySelectorAll(".filter-btn");

const STORAGE_KEY = "modernTodoTasks";
const API_URL = "https://todo-reminder-backend-1.onrender.com";

let tasks = [];
let activeFilter = "All";

try {
  tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
} catch {
  tasks = [];
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

// Convert VAPID public key
function base64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const raw = atob(base64);

  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

// Register Service Worker
async function getServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Worker ee browser lo support ledu.");
  }

  await navigator.serviceWorker.register("./service-worker.js");
  return await navigator.serviceWorker.ready;
}

// Get existing subscription
async function getPushSubscription() {
  const registration = await getServiceWorker();
  return await registration.pushManager.getSubscription();
}

// Enable push notifications and save subscription
async function enableNotifications() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    alert("Ee browser push notifications support cheyyadu.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      notificationStatus.textContent =
        "Browser settings lo notifications allow cheyyi.";
      return false;
    }

    const registration = await getServiceWorker();

    const keyResponse = await fetch(`${API_URL}/vapid-public-key`);

    if (!keyResponse.ok) {
      throw new Error("Backend public key fetch avvaledu.");
    }

    const { publicKey } = await keyResponse.json();

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(publicKey)
      });
    }

    const saveResponse = await fetch(`${API_URL}/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        subscription: subscription.toJSON()
      })
    });

    if (!saveResponse.ok) {
      const message = await saveResponse.text();
      throw new Error(`Subscription save failed: ${message}`);
    }

    notificationStatus.textContent = "✅ Notifications enabled!";
    alert("Push notifications setup successful!");
    return true;
  } catch (error) {
    console.error("Push setup error:", error);
    notificationStatus.textContent = "❌ Notification setup failed.";
    alert("Push setup failed: " + error.message);
    return false;
  }
}

if (notificationButton) {
  notificationButton.addEventListener("click", enableNotifications);
}

// Dark mode
if (themeBtn) {
  if (localStorage.getItem("todoDarkMode") === "true") {
    document.body.classList.add("dark");
    themeBtn.textContent = "☀️ Light";
  }

  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const isDark = document.body.classList.contains("dark");

    themeBtn.textContent = isDark ? "☀️ Light" : "🌙 Dark";
    localStorage.setItem("todoDarkMode", isDark);
  });
}

// Schedule reminder through backend
async function scheduleBackendReminder(task) {
  if (!task.reminderTime || task.done) return;

  const dueAt = new Date(task.reminderTime);

  if (Number.isNaN(dueAt.getTime()) || dueAt.getTime() <= Date.now()) {
    return;
  }

  try {
    const subscription = await getPushSubscription();

    if (!subscription) {
      console.warn("Push subscription ledu. Enable Notifications click cheyyi.");
      return;
    }

    const response = await fetch(`${API_URL}/reminders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        taskText: task.text,
        dueAt: dueAt.toISOString()
      })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Reminder backend lo save avvaledu.");
    }

    console.log("Backend reminder scheduled:", task.text);
  } catch (error) {
    console.error("Reminder scheduling failed:", error);
    alert("Reminder backend lo save cheyyalekapoyam: " + error.message);
  }
}

// Add task
taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = taskInput.value.trim();
  const reminderTime = reminderInput.value;

  if (!text) {
    alert("Task name enter cheyyi.");
    return;
  }

  if (
    reminderTime &&
    new Date(reminderTime).getTime() <= Date.now()
  ) {
    alert("Future date and time select cheyyi.");
    return;
  }

  const task = {
    id: Date.now().toString() +
      Math.random().toString(16).slice(2),
    text,
    priority: priorityInput.value,
    dueDate: dueDateInput.value,
    reminderTime,
    done: false
  };

  tasks.unshift(task);
  saveTasks();

  if (reminderTime) {
    if (Notification.permission === "granted") {
      await scheduleBackendReminder(task);
    } else {
      alert("Munduga Enable Notifications click cheyyi.");
    }
  }

  taskForm.reset();
  priorityInput.value = "Medium";

  renderTasks();
  taskInput.focus();
});

// Complete / undo task
function toggleTask(id) {
  tasks = tasks.map((task) => {
    if (task.id !== id) return task;

    const updatedTask = { ...task, done: !task.done };

    // Marking a task complete does not cancel a reminder
    // already stored on the backend.
    if (!updatedTask.done) {
      scheduleBackendReminder(updatedTask);
    }

    return updatedTask;
  });

  saveTasks();
  renderTasks();
}

// Delete task
function deleteTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  saveTasks();
  renderTasks();
}

// Render tasks
function renderTasks() {
  const searchTerm = searchInput.value.toLowerCase().trim();

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.text.toLowerCase().includes(searchTerm);

    const matchesFilter =
      activeFilter === "All" ||
      (activeFilter === "Pending" && !task.done) ||
      (activeFilter === "Completed" && task.done);

    return matchesSearch && matchesFilter;
  });

  if (filteredTasks.length === 0) {
    taskList.innerHTML = `
      <li class="empty">No tasks found. Add a new task! ✨</li>
    `;
  } else {
    taskList.innerHTML = filteredTasks.map((task) => {
      const due = task.dueDate
        ? `📅 Due: ${escapeHTML(task.dueDate)}`
        : "";

      const reminder = task.reminderTime
        ? `🔔 Reminder: ${escapeHTML(
            new Date(task.reminderTime).toLocaleString()
          )}`
        : "";

      return `
        <li class="task ${task.done ? "done" : ""}">
          <div class="task-info">
            <input
              type="checkbox"
              data-action="toggle"
              data-id="${escapeHTML(task.id)}"
              ${task.done ? "checked" : ""}
              aria-label="Complete task"
            >

            <div>
              <div class="task-text">${escapeHTML(task.text)}</div>

              <div class="meta">
                <span class="priority ${escapeHTML(task.priority)}">
                  ${escapeHTML(task.priority)}
                </span>

                ${due ? `<div>${due}</div>` : ""}
                ${reminder ? `<div>${reminder}</div>` : ""}
              </div>
            </div>
          </div>

          <button
            type="button"
            class="delete-btn"
            data-action="delete"
            data-id="${escapeHTML(task.id)}"
          >
            Delete
          </button>
        </li>
      `;
    }).join("");
  }

  updateSummary();
}

// Summary and progress
function updateSummary() {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.done).length;
  const pending = total - completed;

  summary.textContent =
    `Total: ${total} | Pending: ${pending} | Completed: ${completed}`;

  const percent = total === 0
    ? 0
    : Math.round((completed / total) * 100);

  progress.textContent = `Progress: ${percent}%`;
}

// Task list events
taskList.addEventListener("change", (event) => {
  const checkbox = event.target.closest('[data-action="toggle"]');

  if (checkbox) {
    toggleTask(checkbox.dataset.id);
  }
});

taskList.addEventListener("click", (event) => {
  const button = event.target.closest('[data-action="delete"]');

  if (button) {
    deleteTask(button.dataset.id);
  }
});

// Search
searchInput.addEventListener("input", renderTasks);

// Filters
filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((item) => item.classList.remove("active"));

    button.classList.add("active");
    activeFilter = button.dataset.filter;

    renderTasks();
  });
});

// Clear completed tasks
clearCompletedBtn.addEventListener("click", () => {
  tasks = tasks.filter((task) => !task.done);
  saveTasks();
  renderTasks();
});

// Initial load
renderTasks();

if ("Notification" in window && Notification.permission === "granted") {
  notificationStatus.textContent = "✅ Notifications permission granted";
}

getServiceWorker().then(() => {
  console.log("Service Worker ready");
}).catch((error) => {
  console.error("Service Worker registration failed:", error);
});
```
