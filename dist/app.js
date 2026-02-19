"use strict";
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
        const task = tasks.find(t => t.id === editTaskId);
        task.name = nameInput.value;
        task.description = descInput.value;
        task.link = linkInput.value;
        task.status = statusInput.value;
        task.startDate = startInput.value;
        task.endDate = endInput.value;
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
            comments: []
        });
    }
    saveToStorage();
    closeModal();
    renderTasks();
}
function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveToStorage();
    renderTasks();
}
function addComment(taskId) {
    const input = document.getElementById(`comment-${taskId}`);
    const task = tasks.find(t => t.id === taskId);
    if (!input.value.trim())
        return;
    task.comments.push({
        id: Date.now(),
        text: input.value,
        timestamp: new Date().toLocaleString()
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
    let filtered = tasks.filter(t => t.name.toLowerCase().includes(searchName) &&
        (!searchStatus || t.status === searchStatus));
    if (sortBy) {
        filtered.sort((a, b) => a[sortBy].localeCompare(b[sortBy]));
    }
    container.innerHTML = "";
    container.className = cardsView ? "cards-view" : "";
    filtered.forEach(task => {
        const div = document.createElement("div");
        div.className = "task-card";
        div.draggable = true;
        div.dataset.id = task.id.toString();
        const progress = getProgress(task.status);
        const progressClass = getProgressClass(task.status);
        const alert = getDueDateAlert(task.endDate);
        div.innerHTML = `
            <strong>${task.name}</strong>
            <span class="status ${task.status.replace(" ", "\\ ")}">${task.status}</span>

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

            <div class="comments">
                <input id="comment-${task.id}" placeholder="Add comment"/>
                <button onclick="addComment(${task.id})">Add</button>
                ${task.comments.map(c => `
                <div class="comment">
                    ${c.text}
                    <div class="timestamp">${c.timestamp}</div>
                </div>
                `).join("")}
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
    card.addEventListener("dragover", e => {
        e.preventDefault();
        const dragging = document.querySelector(".dragging");
        if (!dragging || dragging === card)
            return;
        const ids = Array.from(container.children).map(c => c.dataset.id);
        const draggedId = dragging.dataset.id;
        const targetId = card.dataset.id;
        const draggedIndex = tasks.findIndex(t => t.id == Number(draggedId));
        const targetIndex = tasks.findIndex(t => t.id == Number(targetId));
        [tasks[draggedIndex], tasks[targetIndex]] =
            [tasks[targetIndex], tasks[draggedIndex]];
        renderTasks();
    });
}
function editTask(id) {
    const task = tasks.find(t => t.id === id);
    openModal(task);
}
window.deleteTask = deleteTask;
window.editTask = editTask;
window.addComment = addComment;
renderTasks();
function getProgress(status) {
    switch (status) {
        case "Pending": return 25;
        case "In Progress": return 65;
        case "Completed": return 100;
        default: return 0;
    }
}
function getProgressClass(status) {
    switch (status) {
        case "Pending": return "progress-pending";
        case "In Progress": return "progress-inprogress";
        case "Completed": return "progress-completed";
        default: return "";
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
