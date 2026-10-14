const $ = (id) => document.getElementById(id);

// HTML elements
const taskForm = $("taskForm");
const taskInput = $("taskInput");
const priorityInput = $("priority");
const dueDateInput = $("dueDate");
const reminderInput = $("reminderTime");
const taskList = $("taskList");
const searchInput = $("searchInput");
const filterButtons = document.querySelectorAll(".filter-btn");
const notificationButton = $("enableNotifications");
const notificationStatus = $("notificationStatus");

// Local storage
const STORAGE_KEY = "modernTodoTasks";

let tasks = [];

try {
  tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
} catch (error) {
  tasks = [];
}

// Save tasks
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// HTML text safe ga display cheyyadaniki
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entities[char];
  });
}

// Notification permission enable cheyyadam
async function enableNotifications() {
  if (!("Notification" in window)) {
    alert("Ee browser notifications support cheyyadu.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      if (notificationStatus) {
        notificationStatus.textContent =
          "Notifications allow cheyyaledu. Browser settings check cheyyi.";
      }

      alert("Browser settings lo notifications allow cheyyi.");
      return false;
    }

    if (notificationStatus) {
      notificationStatus.textContent = "Notifications enabled!";
    }

    alert("Notifications enabled!");
    return true;
  } catch (error) {
    alert("Notifications enable cheyyadam lo problem vachindi.");
    return false;
  }
}

// Reminder set cheyyadam
function setTaskReminder(taskId, taskName, dateTime) {
  const reminderDate = new Date(dateTime);
  const delay = reminderDate.getTime() - Date.now();

  if (Number.isNaN(reminderDate.getTime()) || delay <= 0) {
    alert("Future date and time select cheyyi.");
    return;
  }

  if (
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    alert("Munduga Enable Notifications button click cheyyi.");
    return;
  }

  // Browser timer maximum delay limit
  const maxDelay = 2147483647;

  if (delay > maxDelay) {
    alert("Ee reminder chala future lo undi. Date daggara vachinappudu malli set cheyyi.");
    return;
  }

  setTimeout(() => {
    const task = tasks.find((item) => item.id === taskId);

    if (!task || task.done) {
      return;
    }

    new Notification("To-Do List Reminder", {
      body: "Task complete cheyyali: " + taskName
    });
  }, delay);

  alert("Reminder set ayyindi!");
}

// Task add cheyyadam
if (taskForm) {
  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const text = taskInput.value.trim();

    if (!text) {
      alert("Task name enter cheyyi.");
      taskInput.focus();
      return;
    }

    const reminderTime = reminderInput
      ? reminderInput.value
      : "";

    if (
      reminderTime &&
      new Date(reminderTime).getTime() <= Date.now()
    ) {
      alert("Future date and time select cheyyi.");
      return;
    }

    const newTask = {
      id: Date.now().toString() +
        Math.random().toString(16).slice(2),
      text: text,
      priority: priorityInput ? priorityInput.value : "Medium",
      dueDate: dueDateInput ? dueDateInput.value : "",
      reminderTime: reminderTime,
      done: false
    };

    tasks.unshift(newTask);

    saveTasks();

    if (newTask.reminderTime) {
      setTaskReminder(
        newTask.id,
        newTask.text,
        newTask.reminderTime
      );
    }

    taskForm.reset();

    if (priorityInput) {
      priorityInput.value = "Medium";
    }

    renderTasks();
    taskInput.focus();
  });
}

// Task complete / incomplete cheyyadam
function toggleTask(taskId) {
  tasks = tasks.map((task) => {
    if (task.id === taskId) {
      return {
        ...task,
        done: !task.done
      };
    }

    return task;
  });

  saveTasks();
  renderTasks();
}

// Task delete cheyyadam
function deleteTask(taskId) {
  tasks = tasks.filter((task) => task.id !== taskId);

  saveTasks();
  renderTasks();
}

// Due date format
function formatDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString + "T00:00:00");

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString();
}

// Tasks display cheyyadam
function renderTasks() {
  if (!taskList) {
    return;
  }

  const searchTerm = searchInput
    ? searchInput.value.toLowerCase().trim()
    : "";

  const activeFilter = document.querySelector(
    ".filter-btn.active"
  );

  const filter = activeFilter
    ? activeFilter.dataset.filter
    : "all";

  let filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.text
      .toLowerCase()
      .includes(searchTerm);

    let matchesFilter = true;

    if (filter === "active") {
      matchesFilter = !task.done;
    } else if (filter === "completed") {
      matchesFilter = task.done;
    }

    return matchesSearch && matchesFilter;
  });

  if (filteredTasks.length === 0) {
    taskList.innerHTML = `
      <li class="empty-state">
        Tasks levu. Kotha task add cheyyi!
      </li>
    `;
    updateTaskCounts();
    return;
  }

  taskList.innerHTML = filteredTasks.map((task) => {
    const safeText = escapeHTML(task.text);
    const safePriority = escapeHTML(task.priority || "Medium");
    const safeDueDate = formatDate(task.dueDate);
    const safeReminder = task.reminderTime
      ? new Date(task.reminderTime).toLocaleString()
      : "";

    return `
      <li class="task-item ${task.done ? "completed" : ""}">
        <div class="task-content">
          <input
            type="checkbox"
            class="task-checkbox"
            data-action="toggle"
            data-id="${escapeHTML(task.id)}"
            ${task.done ? "checked" : ""}
            aria-label="Mark task complete"
          >

          <div class="task-details">
            <span class="task-text">${safeText}</span>

            <div class="task-meta">
              <span class="priority priority-${safePriority.toLowerCase()}">
                ${safePriority}
              </span>

              ${
                safeDueDate
                  ? `<span class="task-date">Due: ${escapeHTML(safeDueDate)}</span>`
                  : ""
              }

              ${
                safeReminder
                  ? `<span class="task-reminder">🔔 ${escapeHTML(safeReminder)}</span>`
                  : ""
              }
            </div>
          </div>
        </div>

        <button
          type="button"
          class="delete-btn"
          data-action="delete"
          data-id="${escapeHTML(task.id)}"
          aria-label="Delete task"
        >
          Delete
        </button>
      </li>
    `;
  }).join("");

  updateTaskCounts();
}

// Task list buttons handle cheyyadam
if (taskList) {
  taskList.addEventListener("click", (event) => {
    const button = event.target.closest(
      'button[data-action="delete"]'
    );

    if (button) {
      deleteTask(button.dataset.id);
    }
  });

  taskList.addEventListener("change", (event) => {
    const checkbox = event.target.closest(
      'input[data-action="toggle"]'
    );

    if (checkbox) {
      toggleTask(checkbox.dataset.id);
    }
  });
}

// Task counts update cheyyadam
function updateTaskCounts() {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.done).length;
  const remaining = total - completed;

  const totalElement = $("totalTasks");
  const completedElement = $("completedTasks");
  const remainingElement = $("remainingTasks");

  if (totalElement) {
    totalElement.textContent = total;
  }

  if (completedElement) {
    completedElement.textContent = completed;
  }

  if (remainingElement) {
    remainingElement.textContent = remaining;
  }
}

// Search
if (searchInput) {
  searchInput.addEventListener("input", renderTasks);
}

// Filter buttons
filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");
    renderTasks();
  });
});

// Enable notifications button
if (notificationButton) {
  notificationButton.addEventListener(
    "click",
    enableNotifications
  );
}

// Initial display
renderTasks();
