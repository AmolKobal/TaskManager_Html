"use strict";
const WIP_LIMITS = {
    Pending: 5,
    "In Progress": 3,
    Completed: 999,
};
let tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
let editTaskId = null;
let cardsView = true;
const container = document.getElementById("taskContainer");
const modal = document.getElementById("taskModal");
const modalTitle = document.getElementById("modalTitle");
const nameInput = document.getElementById("name");
const descInput = document.getElementById("description");
const linkInput = document.getElementById("link");
const statusInput = document.getElementById("status");
const startInput = document.getElementById("startDate");
const endInput = document.getElementById("endDate");
const nameError = document.getElementById("nameError");
const startError = document.getElementById("startError");
const endError = document.getElementById("endError");
document.getElementById("openModalBtn").onclick = () => openModal();
document.getElementById("closeModalBtn").onclick = () => closeModal();
document.getElementById("saveTaskBtn").onclick = () => saveTask();
document.getElementById("toggleViewBtn").onclick = () => toggleView();
document.getElementById("searchName").oninput = renderTasks;
document.getElementById("searchStatus").onchange = renderTasks;
document.getElementById("sortBy").onchange = renderTasks;
let kanbanView = false;
function saveToStorage() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}
function openModal(task) {
    modal.classList.remove("hidden");
    if (task) {
        modalTitle.textContent = "Edit Task";
        editTaskId = task.id;
        nameInput.value = task.name;
        descInput.value = task.description;
        linkInput.value = task.link;
        statusInput.value = task.status;
        startInput.value = task.startDate;
        endInput.value = task.endDate;
    }
    else {
        modalTitle.textContent = "Add Task";
        editTaskId = null;
        clearForm();
    }
}
function closeModal() {
    modal.classList.add("hidden");
    clearErrors();
}
function clearForm() {
    nameInput.value = "";
    descInput.value = "";
    linkInput.value = "";
    startInput.value = "";
    endInput.value = "";
}
function clearErrors() {
    nameError.textContent = "";
    startError.textContent = "";
    endError.textContent = "";
}
function validate() {
    clearErrors();
    let valid = true;
    if (!nameInput.value.trim()) {
        nameError.textContent = "Task name required";
        valid = false;
    }
    if (!startInput.value) {
        startError.textContent = "Start date required";
        valid = false;
    }
    if (endInput.value && endInput.value < startInput.value) {
        endError.textContent = "End date must be after start date";
        valid = false;
    }
    return valid;
}
function saveTask() {
    if (!validate())
        return;
    if (editTaskId) {
        const task = tasks.find((t) => t.id === editTaskId);
        task.name = nameInput.value;
        task.description = descInput.value;
        task.link = linkInput.value;
        task.status = statusInput.value;
        task.startDate = startInput.value;
        task.endDate = endInput.value;
        task.priority = "Medium";
        task.user = "Unassigned";
    }
    else {
        tasks.push({
            id: Date.now(),
            name: nameInput.value,
            description: descInput.value,
            link: linkInput.value,
            status: statusInput.value,
            startDate: startInput.value,
            endDate: endInput.value,
            comments: [],
            priority: "Medium",
            user: "Unassigned",
        });
    }
    saveToStorage();
    closeModal();
    renderTasks();
}
function deleteTask(id) {
    tasks = tasks.filter((t) => t.id !== id);
    saveToStorage();
    renderTasks();
}
function addComment(taskId) {
    const input = document.getElementById(`comment-${taskId}`);
    const task = tasks.find((t) => t.id === taskId);
    if (!input.value.trim())
        return;
    task.comments.push({
        id: Date.now(),
        text: input.value,
        timestamp: new Date().toLocaleString(),
    });
    input.value = "";
    saveToStorage();
    renderTasks();
}
function toggleView() {
    cardsView = !cardsView;
    renderTasks();
}
function renderTasks() {
    const searchName = document.getElementById("searchName").value.toLowerCase();
    const searchStatus = document.getElementById("searchStatus").value;
    const sortBy = document.getElementById("sortBy").value;
    let filtered = tasks.filter((t) => t.name.toLowerCase().includes(searchName) && (!searchStatus || t.status === searchStatus));
    if (sortBy && !kanbanView) {
        filtered.sort((a, b) => a[sortBy].localeCompare(b[sortBy]));
    }
    container.innerHTML = "";
    if (kanbanView) {
        renderKanban(filtered);
    }
    else {
        container.className = cardsView ? "cards-view" : "";
        renderCards(filtered);
    }
}
function groupTasks(tasksList) {
    if (swimlaneMode === "none") {
        return { "All Tasks": tasksList };
    }
    const key = swimlaneMode; // "priority" | "user"
    return tasksList.reduce((acc, task) => {
        const groupValue = task[key] || "Unassigned";
        if (!acc[groupValue])
            acc[groupValue] = [];
        acc[groupValue].push(task);
        return acc;
    }, {});
}
function renderKanban(filtered) {
    container.className = "";
    container.innerHTML = "";
    const grouped = groupTasks(filtered);
    Object.entries(grouped).forEach(([lane, laneTasks]) => {
        const laneDiv = document.createElement("div");
        laneDiv.className = "swimlane";
        laneDiv.innerHTML = `<div class="swimlane-title">${lane}</div>`;
        container.appendChild(laneDiv);
        renderKanbanColumns(laneDiv, laneTasks);
    });
    updateWipWarnings();
}
function addKanbanDragHandlers(card) {
    card.addEventListener("dragstart", () => {
        card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
    });
}
function renderCards(filtered) {
    container.className = "cards-view";
    filtered.forEach((task) => {
        const div = document.createElement("div");
        div.className = "task-card";
        div.draggable = true;
        div.dataset.id = task.id.toString();
        const progress = getProgress(task.status);
        const progressClass = getProgressClass(task.status);
        const alert = getDueDateAlert(task.endDate);
        div.innerHTML = `
            <strong>${task.name}</strong>
            <span class="status ${task.status.replace(" ", "")}">${task.status}</span>

            <div class="progress-container">
                <div class="progress-bar ${progressClass}" style="width:${progress}%"></div>
            </div>

            <p>${task.description}</p>
            <small>📅 ${task.startDate} → ${task.endDate || "-"}</small>
            ${alert ? `<div class="alert ${alert.type}">${alert.text}</div>` : ""}

            <div>
                <button onclick="editTask(${task.id})">Edit</button>
                <button onclick="deleteTask(${task.id})">Delete</button>
            </div>
    `;
        addDragAndDropHandlers(div);
        container.appendChild(div);
    });
}
function addDragAndDropHandlers(card) {
    card.addEventListener("dragstart", () => {
        card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
        saveToStorage();
    });
    card.addEventListener("dragover", (e) => {
        e.preventDefault();
        const dragging = document.querySelector(".dragging");
        if (!dragging || dragging === card)
            return;
        const ids = Array.from(container.children).map((c) => c.dataset.id);
        const draggedId = dragging.dataset.id;
        const targetId = card.dataset.id;
        const draggedIndex = tasks.findIndex((t) => t.id == Number(draggedId));
        const targetIndex = tasks.findIndex((t) => t.id == Number(targetId));
        [tasks[draggedIndex], tasks[targetIndex]] = [tasks[targetIndex], tasks[draggedIndex]];
        renderTasks();
    });
}
function editTask(id) {
    const task = tasks.find((t) => t.id === id);
    openModal(task);
}
window.deleteTask = deleteTask;
window.editTask = editTask;
window.addComment = addComment;
renderTasks();
function getProgress(status) {
    switch (status) {
        case "Pending":
            return 25;
        case "In Progress":
            return 65;
        case "Completed":
            return 100;
        default:
            return 0;
    }
}
function getProgressClass(status) {
    switch (status) {
        case "Pending":
            return "progress-pending";
        case "In Progress":
            return "progress-inprogress";
        case "Completed":
            return "progress-completed";
        default:
            return "";
    }
}
function getDueDateAlert(endDate) {
    if (!endDate)
        return null;
    const today = new Date();
    const due = new Date(endDate);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
        return { text: "⚠ Overdue", type: "overdue" };
    }
    if (diffDays <= 2) {
        return { text: `⏳ Due soon (${diffDays}d)`, type: "upcoming" };
    }
    return null;
}
document.getElementById("kanbanViewBtn").onclick = () => {
    kanbanView = !kanbanView;
    renderTasks();
};
document.getElementById("kanbanViewBtn").onclick = () => {
    kanbanView = !kanbanView;
    renderTasks();
};
function toggleColumn(status) {
    document.querySelectorAll(`.kanban-column`).forEach((col) => {
        var _a;
        const header = (_a = col.querySelector("h3")) === null || _a === void 0 ? void 0 : _a.textContent;
        if (header === status) {
            col.classList.toggle("collapsed");
        }
    });
}
window.toggleColumn = toggleColumn;
function enableReorder(card) {
    card.addEventListener("dragover", (e) => {
        e.preventDefault();
        card.classList.add("over");
    });
    card.addEventListener("dragleave", () => {
        card.classList.remove("over");
    });
    card.addEventListener("drop", () => {
        const dragging = document.querySelector(".dragging");
        if (!dragging || dragging === card)
            return;
        const draggedId = Number(dragging.dataset.id);
        const targetId = Number(card.dataset.id);
        const draggedIndex = tasks.findIndex((t) => t.id === draggedId);
        const targetIndex = tasks.findIndex((t) => t.id === targetId);
        const [moved] = tasks.splice(draggedIndex, 1);
        tasks.splice(targetIndex, 0, moved);
        saveToStorage();
        renderTasks();
    });
}
function updateWipWarnings() {
    Object.keys(WIP_LIMITS).forEach((status) => {
        const warning = document.getElementById(`wip-${status}`);
        const count = tasks.filter((t) => t.status === status).length;
        if (count >= WIP_LIMITS[status]) {
            warning.textContent = `⚠ WIP Limit (${count}/${WIP_LIMITS[status]})`;
        }
        else {
            warning.textContent = "";
        }
    });
}
let swimlaneMode = "none";
function groupBy(mode) {
    swimlaneMode = mode;
    renderTasks();
}
window.groupBy = groupBy;
function requestNotificationPermission() {
    if ("Notification" in window) {
        Notification.requestPermission();
    }
}
function showNotification(title, body) {
    if (Notification.permission === "granted") {
        new Notification(title, { body });
    }
}
//requestNotificationPermission();
function renderKanbanColumns(parent, laneTasks) {
    const board = document.createElement("div");
    board.className = "kanban-board";
    const statuses = ["Pending", "In Progress", "Completed"];
    const statuses_class = {
        "Pending": "kanban-pending",
        "In Progress": "kanban-inProgress",
        "Completed": "kanban-completed"
    };
    statuses.forEach((status) => {
        const column = document.createElement("div");
        column.className = `kanban-column ${statuses_class[status]}`;
        column.innerHTML = `
            <div class="kanban-column-header">
                <h3>${status}</h3>
                <button onclick="toggleColumn('${status}')">⮟</button>
            </div>
            <div class="kanban-dropzone" data-status="${status}"></div>
            <div class="wip-warning" id="wip-${status}"></div>
            `;
        board.appendChild(column);
    });
    parent.appendChild(board);
    laneTasks.forEach((task) => {
        const card = document.createElement("div");
        card.className = "task-card";
        card.draggable = true;
        card.dataset.id = task.id.toString();
        const progress = getProgress(task.status);
        const progressClass = getProgressClass(task.status);
        const alert = getDueDateAlert(task.endDate);
        card.innerHTML = `
      <strong>${task.name}</strong>
      <div class="progress-container">
        <div class="progress-bar ${progressClass}" style="width:${progress}%"></div>
      </div>
      <small>📅 ${task.endDate || "-"}</small>
      ${alert ? `<div class="alert ${alert.type}">${alert.text}</div>` : ""}
    `;
        addKanbanDragHandlers(card);
        enableReorder(card);
        const zone = board.querySelector(`[data-status="${task.status}"]`);
        zone === null || zone === void 0 ? void 0 : zone.appendChild(card);
    });
    addKanbanDropzones(board);
}
function addKanbanDropzones(board) {
    const zones = board.querySelectorAll(".kanban-dropzone");
    zones.forEach((zone) => {
        zone.addEventListener("dragover", (e) => e.preventDefault());
        zone.addEventListener("drop", () => {
            const dragging = document.querySelector(".dragging");
            if (!dragging)
                return;
            const taskId = Number(dragging.dataset.id);
            const newStatus = zone.dataset.status;
            const count = tasks.filter((t) => t.status === newStatus).length;
            if (count >= WIP_LIMITS[newStatus]) {
                showNotification("WIP Limit Reached", `${newStatus} column is full`);
                return;
            }
            const task = tasks.find((t) => t.id === taskId);
            task.status = newStatus;
            saveToStorage();
            renderTasks();
        });
    });
}
const themeToggleBtn = document.getElementById("themeToggleBtn");
function loadTheme() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark");
        themeToggleBtn.textContent = "☀️";
    }
}
function toggleTheme() {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    themeToggleBtn.textContent = isDark ? "☀️" : "🌙";
}
themeToggleBtn.addEventListener("click", toggleTheme);
loadTheme();
