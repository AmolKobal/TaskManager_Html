interface TaskComment {
    id: number;
    text: string;
    timestamp: string;
}

interface Task {
    id: number;
    name: string;
    description: string;
    link: string;
    status: string;
    startDate: string;
    endDate: string;
    comments: TaskComment[];
}

let tasks: Task[] = JSON.parse(localStorage.getItem("tasks") || "[]");
let editTaskId: number | null = null;
let cardsView = true;

const container = document.getElementById("taskContainer")!;
const modal = document.getElementById("taskModal")!;
const modalTitle = document.getElementById("modalTitle")!;

const nameInput = document.getElementById("name") as HTMLInputElement;
const descInput = document.getElementById("description") as HTMLInputElement;
const linkInput = document.getElementById("link") as HTMLInputElement;
const statusInput = document.getElementById("status") as HTMLSelectElement;
const startInput = document.getElementById("startDate") as HTMLInputElement;
const endInput = document.getElementById("endDate") as HTMLInputElement;

const nameError = document.getElementById("nameError")!;
const startError = document.getElementById("startError")!;
const endError = document.getElementById("endError")!;

document.getElementById("openModalBtn")!.onclick = () => openModal();
document.getElementById("closeModalBtn")!.onclick = () => closeModal();
document.getElementById("saveTaskBtn")!.onclick = () => saveTask();
document.getElementById("toggleViewBtn")!.onclick = () => toggleView();

document.getElementById("searchName")!.oninput = renderTasks;
document.getElementById("searchStatus")!.onchange = renderTasks;
document.getElementById("sortBy")!.onchange = renderTasks;

function saveToStorage() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function openModal(task?: Task) {
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
    } else {
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

function validate(): boolean {
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
    if (!validate()) return;

    if (editTaskId) {
        const task = tasks.find(t => t.id === editTaskId)!;
        task.name = nameInput.value;
        task.description = descInput.value;
        task.link = linkInput.value;
        task.status = statusInput.value;
        task.startDate = startInput.value;
        task.endDate = endInput.value;
    } else {
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

function deleteTask(id: number) {
    tasks = tasks.filter(t => t.id !== id);
    saveToStorage();
    renderTasks();
}

function addComment(taskId: number) {
    const input = document.getElementById(`comment-${taskId}`) as HTMLInputElement;
    const task = tasks.find(t => t.id === taskId)!;

    if (!input.value.trim()) return;

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
    const searchName = (document.getElementById("searchName") as HTMLInputElement).value.toLowerCase();
    const searchStatus = (document.getElementById("searchStatus") as HTMLSelectElement).value;
    const sortBy = (document.getElementById("sortBy") as HTMLSelectElement).value;

    let filtered = tasks.filter(t =>
        t.name.toLowerCase().includes(searchName) &&
        (!searchStatus || t.status === searchStatus)
    );

    if (sortBy) {
        filtered.sort((a, b) =>
            (a as any)[sortBy].localeCompare((b as any)[sortBy])
        );
    }

    container.innerHTML = "";
    container.className = cardsView ? "cards-view" : "";

    filtered.forEach(task => {
        const div = document.createElement("div");
        div.className = "task-card";
        div.draggable = true;
        div.dataset.id = task.id.toString();

        div.innerHTML = `
      <strong>${task.name}</strong>
      <span class="status ${task.status.replace(" ", "\\ ")}">${task.status}</span>
      <p>${task.description}</p>
      <small>📅 ${task.startDate} → ${task.endDate || "-"}</small>
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

function addDragAndDropHandlers(card: HTMLElement) {
    card.addEventListener("dragstart", () => {
        card.classList.add("dragging");
    });

    card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
        saveToStorage();
    });

    card.addEventListener("dragover", e => {
        e.preventDefault();
        const dragging = document.querySelector(".dragging") as HTMLElement;
        if (!dragging || dragging === card) return;

        const ids = Array.from(container.children).map(c => (c as HTMLElement).dataset.id);
        const draggedId = dragging.dataset.id!;
        const targetId = card.dataset.id!;

        const draggedIndex = tasks.findIndex(t => t.id == Number(draggedId));
        const targetIndex = tasks.findIndex(t => t.id == Number(targetId));

        [tasks[draggedIndex], tasks[targetIndex]] =
            [tasks[targetIndex], tasks[draggedIndex]];

        renderTasks();
    });
}

function editTask(id: number) {
    const task = tasks.find(t => t.id === id)!;
    openModal(task);
}

(window as any).deleteTask = deleteTask;
(window as any).editTask = editTask;
(window as any).addComment = addComment;

renderTasks();
