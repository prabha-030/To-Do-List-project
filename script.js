
const $ = (id) => document.getElementById(id);

const taskForm = $("taskForm");
const taskInput = $("taskInput");
const priorityInput = $("priority");
const dueDateInput = $("dueDate");
const searchInput = $("search");
const taskList = $("taskList");

let tasks = [];
try {
  const saved = JSON.parse(localStorage.getItem("modernTodoTasks") || "[]");
  if (Array.isArray(saved)) tasks = saved;
} catch {
  tasks = [];
}

let currentFilter = "All";

function saveTasks() {
  localStorage.setItem("modernTodoTasks", JSON.stringify(tasks));
}

function renderTasks() {
  const query = searchInput.value.trim().toLowerCase();

  const visible = tasks.filter(task => {
    const matchesSearch = task.text.toLowerCase().includes(query);
    const matchesFilter =
      currentFilter === "All" ||
      (currentFilter === "Pending" && !task.done) ||
      (currentFilter === "Completed" && task.done);

    return matchesSearch && matchesFilter;
  });

  taskList.replaceChildren();

  $("summary").textContent =
    `${tasks.filter(t => !t.done).length} pending · ${tasks.filter(t => t.done).length} completed`;

  $("progress").textContent = tasks.length
    ? `${Math.round(tasks.filter(t => t.done).length / tasks.length * 100)}% completed`
    : "Your journey starts with one task!";

  if (visible.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = tasks.length ? "No matching tasks found." : "No tasks yet. Add your first task!";
    taskList.appendChild(empty);
  }

  visible.forEach(task => {
    const li = document.createElement("li");
    li.className = "task" + (task.done ? " done" : "");

    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = task.done;
    check.setAttribute("aria-label", "Mark task completed");
    check.addEventListener("change", () => {
      task.done = check.checked;
      saveTasks();
      renderTasks();
    });

    const info = document.createElement("div");
    info.className = "task-info";

    const content = document.createElement("div");
    content.style.flex = "1";

    const text = document.createElement("div");
    text.className = "task-text";
    text.textContent = task.text;

    const meta = document.createElement("div");
    meta.className = "meta";

    const priority = document.createElement("span");
    priority.className = "priority " + task.priority;
    priority.textContent = task.priority + " priority";

    meta.appendChild(priority);

    if (task.dueDate) {
      const due = document.createElement("span");
      due.textContent = " · Due: " + task.dueDate;
      if (!task.done && task.dueDate < new Date().toLocaleDateString("en-CA")) {
        due.style.color = "#ef4444";
        due.textContent += " (overdue)";
      }
      meta.appendChild(due);
    }

    content.append(text, meta);
    info.appendChild(check);
    info.appendChild(content);

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.textContent = "Delete";
    del.setAttribute("aria-label", "Delete " + task.text);
    del.addEventListener("click", () => {
      tasks = tasks.filter(t => t.id !== task.id);
      saveTasks();
      renderTasks();
    });

    li.append(info, del);
    taskList.appendChild(li);
  });
}

taskForm.addEventListener("submit", event => {
  event.preventDefault();

  const text = taskInput.value.trim();
  if (!text) return;

  tasks.unshift({
    id: Date.now().toString() + Math.random().toString(16).slice(2),
    text,
    priority: priorityInput.value,
    dueDate: dueDateInput.value,
    done: false
  });

  saveTasks();
  taskForm.reset();
  priorityInput.value = "Medium";
  renderTasks();
  taskInput.focus();
});

searchInput.addEventListener("input", renderTasks);

document.querySelectorAll("[data-filter]").forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach(b => {
      b.classList.toggle("active", b === button);
    });
    renderTasks();
  });
});

$("clearCompleted").addEventListener("click", () => {
  tasks = tasks.filter(task => !task.done);
  saveTasks();
  renderTasks();
});

const themeBtn = $("themeBtn");

if (localStorage.getItem("modernTodoTheme") === "dark") {
  document.body.classList.add("dark");
  themeBtn.textContent = "☀️ Light";
}

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const dark = document.body.classList.contains("dark");
  localStorage.setItem("modernTodoTheme", dark ? "dark" : "light");
  themeBtn.textContent = dark ? "☀️ Light" : "🌙 Dark";
});

renderTasks();
