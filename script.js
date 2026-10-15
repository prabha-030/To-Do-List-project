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

let tasks = [];

try {
  tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
} catch {
  tasks = [];
}

let activeFilter = "All";
const reminderTimers = new Map();

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

// Enable notifications
async function enableNotifications() {
  if (!("Notification" in window)) {
    alert("Ee browser notifications support cheyyadu.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      notificationStatus.textContent = "✅ Notifications enabled!";
      alert("Notifications enabled!");
      return true;
    }

    notificationStatus.textContent =
      "Notifications allow cheyyi in browser settings.";

    alert("Browser settings lo notifications allow cheyyi.");
    return false;
  } catch (error) {
    alert("Notifications enable cheyyadam lo problem vachindi.");
    return false;
  }
}

if (notificationButton) {
  notificationButton.addEventListener("click", enableNotifications);
}

// Set reminder
function setTaskReminder(task) {
  if (!task.reminderTime || task.done) return;

  const reminderDate = new Date(task.reminderTime);
  const delay = reminderDate.getTime() - Date.now();

  if (Number.isNaN(reminderDate.getTime()) || delay <= 0) return;

  // Browser timer limit
  if (delay > 2147483647) return;

  if (reminderTimers.has(task.id)) {
    clearTimeout(reminderTimers.get(task.id));
  }

  const timer = setTimeout(() => {
    const currentTask = tasks.find((item) => item.id === task.id);

    if (
      currentTask &&
      !currentTask.done &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification("🔔 To-Do List Reminder", {
        body: "Task complete cheyyali: " + currentTask.text
      });
    }

    reminderTimers.delete(task.id);
  }, delay);

  reminderTimers.set(task.id, timer);
}

// Restore future reminders after page reload
function restoreReminders() {
  tasks.forEach((task) => {
    if (
      task.reminderTime &&
      !task.done &&
      new Date(task.reminderTime).getTime() > Date.now()
    ) {
      setTaskReminder(task);
    }
  });
}

// Add task
taskForm.addEventListener("submit", (event) => {
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
    if (
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      setTaskReminder(task);
      alert("Task and reminder set ayyayi!");
    } else {
      alert(
        "Task add ayyindi. Reminder kosam munduga Enable Notifications click cheyyi."
      );
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
    if (task.id === id) {
      const updatedTask = { ...task, done: !task.done };

      if (updatedTask.done && reminderTimers.has(id)) {
        clearTimeout(reminderTimers.get(id));
        reminderTimers.delete(id);
      } else if (!updatedTask.done) {
        setTaskReminder(updatedTask);
      }

      return updatedTask;
    }

    return task;
  });

  saveTasks();
  renderTasks();
}

// Delete task
function deleteTask(id) {
  if (reminderTimers.has(id)) {
    clearTimeout(reminderTimers.get(id));
    reminderTimers.delete(id);
  }

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
    filterButtons.forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");
    activeFilter = button.dataset.filter;

    renderTasks();
  });
});

// Clear completed tasks
clearCompletedBtn.addEventListener("click", () => {
  const completedTasks = tasks.filter((task) => task.done);

  completedTasks.forEach((task) => {
    if (reminderTimers.has(task.id)) {
      clearTimeout(reminderTimers.get(task.id));
      reminderTimers.delete(task.id);
    }
  });

  tasks = tasks.filter((task) => !task.done);

  saveTasks();
  renderTasks();
});

// Initial load
renderTasks();
restoreReminders();
if ("Notification" in window) {
  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      new Notification("Test Notification", {
        body: "Nee To-Do List notifications work avutunnayi!"
      });
    } else {
      alert("Notification permission: " + permission);
    }
  });
}