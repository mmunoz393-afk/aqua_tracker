const starterTasks = [
  { id: 1, name: "Ducharme en 5 min", category: "Baño", liters: 35, completed: false, icon: "🚿" },
  { id: 2, name: "Reparar gotera", category: "Mantenimiento", liters: 50, completed: true, icon: "🛠️" },
  { id: 3, name: "Regar plantas", category: "Jardín", liters: 15, completed: false, icon: "🪴" }
];

const iconsByCategory = {
  "Baño": "🚿", "Cocina": "🍽️", "Jardín": "🪴",
  "Limpieza": "🧽", "Mantenimiento": "🛠️", "Otros": "💧"
};

let tasks = loadTasks();
let currentFilter = "all";
let nextId = Math.max(0, ...tasks.map(task => task.id)) + 1;
let toastTimer;

const taskForm = document.querySelector("#taskForm");
const taskName = document.querySelector("#taskName");
const taskCategory = document.querySelector("#taskCategory");
const taskLiters = document.querySelector("#taskLiters");
const taskList = document.querySelector("#taskList");
const emptyState = document.querySelector("#emptyState");
const toast = document.querySelector("#toast");

function loadTasks() {
  try {
    const stored = localStorage.getItem("aquaTrackerTasks");
    return stored ? JSON.parse(stored) : starterTasks.map(task => ({ ...task }));
  } catch {
    return starterTasks.map(task => ({ ...task }));
  }
}

function saveTasks() {
  try { localStorage.setItem("aquaTrackerTasks", JSON.stringify(tasks)); } catch {}
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function renderTasks() {
  const visibleTasks = tasks.filter(task => {
    if (currentFilter === "pending") return !task.completed;
    if (currentFilter === "completed") return task.completed;
    return true;
  });

  taskList.innerHTML = visibleTasks.map(task => `
    <article class="task-card ${task.completed ? "completed" : "pending"}" data-id="${task.id}">
      <div class="task-icon" aria-hidden="true">${task.icon || "💧"}</div>
      <div class="task-content">
        <h3>${escapeHTML(task.name)}</h3>
        <p>Categoría: <strong>${escapeHTML(task.category)}</strong></p>
        <span class="status ${task.completed ? "completed" : "pending"}">${task.completed ? "✓ Completada" : "◷ Pendiente"}</span>
        ${Number(task.liters) > 0 ? `<span class="task-liters">💧 Ahorro estimado: ${Number(task.liters)} L</span>` : ""}
      </div>
      <div class="task-side">
        <input class="complete-check" type="checkbox" aria-label="${task.completed ? "Marcar pendiente" : "Marcar completada"}: ${escapeHTML(task.name)}" ${task.completed ? "checked" : ""}>
        <div class="task-actions">
          <button class="small-action edit" title="Editar tarea" aria-label="Editar ${escapeHTML(task.name)}">✏️</button>
          <button class="small-action delete" title="Eliminar tarea" aria-label="Eliminar ${escapeHTML(task.name)}">🗑️</button>
        </div>
      </div>
    </article>
  `).join("");

  emptyState.hidden = visibleTasks.length > 0;
  document.querySelector("#taskCount").textContent = tasks.length;
  updateSummary();
}

function updateSummary() {
  const completed = tasks.filter(task => task.completed);
  const count = tasks.length;
  const done = completed.length;
  const percent = count ? Math.round(done / count * 100) : 0;
  document.querySelector("#completedCount").textContent = done;
  document.querySelector("#progressText").textContent = `${done}/${count}`;
  document.querySelector("#progressBar").style.width = `${percent}%`;
  // Suma los litros de las tareas completadas como estimación orientativa.
  const saved = completed.reduce((sum, task) => sum + (Number(task.liters) || 0), 0);
  document.querySelector("#savedLiters").textContent = `${saved} L`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

taskForm.addEventListener("submit", event => {
  event.preventDefault();
  const name = taskName.value.trim();
  if (!name) {
    taskName.focus();
    return;
  }
  const liters = taskLiters.value === "" ? 0 : Number(taskLiters.value);
  tasks.unshift({
    id: nextId++,
    name,
    category: taskCategory.value,
    liters: Math.max(0, liters || 0),
    completed: false,
    icon: iconsByCategory[taskCategory.value] || "💧"
  });
  saveTasks();
  currentFilter = "all";
  document.querySelectorAll(".tab").forEach(tab => {
    const active = tab.dataset.filter === "all";
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  taskForm.reset();
  renderTasks();
  showToast("¡Tu nuevo hábito se agregó!");
  taskName.focus();
});

taskList.addEventListener("change", event => {
  if (!event.target.matches(".complete-check")) return;
  const id = Number(event.target.closest(".task-card").dataset.id);
  const task = tasks.find(item => item.id === id);
  if (!task) return;
  task.completed = event.target.checked;
  saveTasks();
  renderTasks();
  showToast(task.completed ? "¡Excelente! Hábito completado 🌱" : "Tarea movida a pendientes");
});

taskList.addEventListener("click", event => {
  const card = event.target.closest(".task-card");
  if (!card) return;
  const id = Number(card.dataset.id);
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  if (event.target.closest(".delete")) {
    if (confirm(`¿Quieres eliminar la tarea "${task.name}"?`)) {
      tasks = tasks.filter(item => item.id !== id);
      saveTasks();
      renderTasks();
      showToast("Tarea eliminada");
    }
  }

  if (event.target.closest(".edit")) {
    const newName = prompt("Editar nombre de la tarea:", task.name);
    if (newName === null) return;
    if (!newName.trim()) {
      showToast("El nombre no puede estar vacío");
      return;
    }
    task.name = newName.trim();
    saveTasks();
    renderTasks();
    showToast("Tarea actualizada");
  }
});

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    currentFilter = tab.dataset.filter;
    document.querySelectorAll(".tab").forEach(item => {
      const active = item === tab;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });
    renderTasks();
  });
});

const tipsDialog = document.querySelector("#tipsDialog");
document.querySelector("#tipsButton").addEventListener("click", () => tipsDialog.showModal());
document.querySelector("#closeTips").addEventListener("click", () => tipsDialog.close());
tipsDialog.addEventListener("click", event => {
  if (event.target === tipsDialog) tipsDialog.close();
});
document.querySelector("#notificationButton").addEventListener("click", () => {
  showToast("¡Recuerda revisar tus hábitos de ahorro hoy! 💧");
});
document.querySelector("#profileButton").addEventListener("click", () => {
  showToast("¡Hola! Este espacio es para tus hábitos sostenibles 🌿");
});
document.querySelector("#year").textContent = new Date().getFullYear();

renderTasks();
