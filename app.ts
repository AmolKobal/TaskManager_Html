interface TaskComment {
    id: number;
    text: string;
    timestamp: string;
}

interface Task {
    id: string;
    name: string;
    description: string;
    link: string;
    status: string;
    startDate: string;
    endDate: string;
    priority?: "Low" | "Medium" | "High";
    user?: string;
    comments: TaskComment[];
}

const WIP_LIMITS: Record<string, number> = {
    Pending: 5,
    "In Progress": 3,
    Completed: 999,
};

let tasks: Task[] = JSON.parse(localStorage.getItem("tasks") || "[]");
let editTaskId: string | null = null;
let cardsView = true;

const container = document.getElementById("taskContainer")!;
const modal = document.getElementById("taskModal")!;
const modalTitle = document.getElementById("modalTitle")!;

const taskName = document.getElementById("taskName") as HTMLInputElement;
const taskDescription = document.getElementById("taskDescription") as HTMLInputElement;
const taskLlink = document.getElementById("taskLink") as HTMLInputElement;
const taskStatus = document.getElementById("taskStatus") as HTMLSelectElement;
const taskStartDate = document.getElementById("taskStartDate") as HTMLInputElement;
const taskEndDate = document.getElementById("taskEndDate") as HTMLInputElement;

const nameError = document.getElementById("nameError")!;
const startError = document.getElementById("startError")!;
const endError = document.getElementById("endError")!;

//document.getElementById("openModalBtn")!.onclick = () => openModal();
document.getElementById("closeModalBtn")!.onclick = () => closeModal();
document.getElementById("saveTaskBtn")!.onclick = () => {
    const task: Task = {
        id: Date.now().toString(),
        name: taskName.value,
        description: taskDescription.value,
        link: taskLlink.value,
        status: taskStatus.value,
        startDate: taskStartDate.value,
        endDate: taskEndDate.value,
        comments: [],
        priority: "Medium",
        user: "Unassigned",
    };
    saveTask(task);
};
document.getElementById("toggleViewBtn")!.onclick = () => toggleView();

document.getElementById("searchName")!.oninput = renderTasks;
document.getElementById("searchStatus")!.onchange = renderTasks;
document.getElementById("sortBy")!.onchange = renderTasks;

let kanbanView = false;

function saveToStorage() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function clearForm() {
    taskName.value = "";
    taskDescription.value = "";
    taskLlink.value = "";
    taskStartDate.value = "";
    taskEndDate.value = "";
}

function clearErrors() {
    if (nameError)
        nameError.textContent = "";
    if (startError)
        startError.textContent = "";
    if (endError)
        endError.textContent = "";
}

function validate(): boolean {
    clearErrors();
    let valid = true;

    if (!taskName.value.trim()) {
        nameError.textContent = "Task name required";
        valid = false;
    }

    if (!taskStartDate.value) {
        startError.textContent = "Start date required";
        valid = false;
    }

    if (taskEndDate.value && taskEndDate.value < taskStartDate.value) {
        endError.textContent = "End date must be after start date";
        valid = false;
    }

    return valid;
}

function saveTask(task: Task) {
    if (!validate()) return;

    if (editTaskId) {
        const existingTask = tasks.find((t) => t.id.toString() === editTaskId?.toString())!;
        Object.assign(existingTask, task);
    } else {
        tasks.push(task);
    }

    saveToStorage();
    closeModal();
    renderTasks();
}

function deleteTask(id: string) {
    tasks = tasks.filter((t) => t.id !== id);
    saveToStorage();
    renderTasks();
}

function addComment(taskId: string) {
    const input = document.getElementById(`comment-${taskId}`) as HTMLInputElement;
    const task = tasks.find((t) => t.id === taskId)!;

    if (!input.value.trim()) return;

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
    const searchName = (
        document.getElementById("searchName") as HTMLInputElement
    ).value.toLowerCase();
    const searchStatus = (document.getElementById("searchStatus") as HTMLSelectElement).value;
    const sortBy = (document.getElementById("sortBy") as HTMLSelectElement).value;

    let filtered = tasks.filter(
        (t) => t.name.toLowerCase().includes(searchName) && (!searchStatus || t.status === searchStatus)
    );

    if (sortBy && !kanbanView) {
        filtered.sort((a, b) => (a as any)[sortBy].localeCompare((b as any)[sortBy]));
    }

    container.innerHTML = "";

    if (kanbanView) {
        renderKanban(filtered);
    } else {
        container.className = cardsView ? "cards-view" : "";
        renderCards(filtered);
    }
}

function groupTasks(tasksList: Task[]): Record<string, Task[]> {
    if (swimlaneMode === "none") {
        return { "All Tasks": tasksList };
    }

    const key = swimlaneMode; // "priority" | "user"

    return tasksList.reduce((acc: Record<string, Task[]>, task) => {
        const groupValue = (task as any)[key] || "Unassigned";
        if (!acc[groupValue]) acc[groupValue] = [];
        acc[groupValue].push(task);
        return acc;
    }, {});
}

function renderKanban(filtered: Task[]) {
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

function addKanbanDragHandlers(card: HTMLElement) {
    card.addEventListener("dragstart", () => {
        card.classList.add("dragging");
    });

    card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
    });
}

function renderCards(filtered: Task[]) {
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

            <a href="${task.link}" target="_blank">${task.link}</a><br/>

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

function addDragAndDropHandlers(card: HTMLElement) {
    card.addEventListener("dragstart", () => {
        card.classList.add("dragging");
    });

    card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
        saveToStorage();
    });

    card.addEventListener("dragover", (e) => {
        e.preventDefault();
        const dragging = document.querySelector(".dragging") as HTMLElement;
        if (!dragging || dragging === card) return;

        const ids = Array.from(container.children).map((c) => (c as HTMLElement).dataset.id);
        const draggedId = dragging.dataset.id!;
        const targetId = card.dataset.id!;

        const draggedIndex = tasks.findIndex((t) => t.id == draggedId);
        const targetIndex = tasks.findIndex((t) => t.id == targetId);

        [tasks[draggedIndex], tasks[targetIndex]] = [tasks[targetIndex], tasks[draggedIndex]];

        renderTasks();
    });
}

function editTask(id: string) {
    const task = tasks.find((t) => t.id == id)!;
    editTaskId = id;
    openEditModal(task);
}

(window as any).deleteTask = deleteTask;
(window as any).editTask = editTask;
(window as any).addComment = addComment;

renderTasks();

function getProgress(status: string): number {
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

function getProgressClass(status: string): string {
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

function getDueDateAlert(endDate: string): { text: string; type: string } | null {
    if (!endDate) return null;

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

document.getElementById("kanbanViewBtn")!.onclick = () => {
    kanbanView = !kanbanView;
    renderTasks();
};

document.getElementById("kanbanViewBtn")!.onclick = () => {
    kanbanView = !kanbanView;
    renderTasks();
};

function toggleColumn(status: string) {
    document.querySelectorAll(`.kanban-column`).forEach((col) => {
        const header = col.querySelector("h3")?.textContent;
        if (header === status) {
            col.classList.toggle("collapsed");
        }
    });
}
(window as any).toggleColumn = toggleColumn;

function enableReorder(card: HTMLElement) {
    card.addEventListener("dragover", (e) => {
        e.preventDefault();
        card.classList.add("over");
    });

    card.addEventListener("dragleave", () => {
        card.classList.remove("over");
    });

    card.addEventListener("drop", () => {
        const dragging = document.querySelector(".dragging") as HTMLElement;
        if (!dragging || dragging === card) return;

        const draggedId = dragging.dataset.id;
        const targetId = card.dataset.id;

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
            warning!.textContent = `⚠ WIP Limit (${count}/${WIP_LIMITS[status]})`;
        } else {
            warning!.textContent = "";
        }
    });
}

let swimlaneMode: "none" | "priority" | "user" = "none";

function groupBy(mode: "priority" | "user" | "none") {
    swimlaneMode = mode;
    renderTasks();
}
(window as any).groupBy = groupBy;

function requestNotificationPermission() {
    if ("Notification" in window) {
        Notification.requestPermission();
    }
}

function showNotification(title: string, body: string) {
    if (Notification.permission === "granted") {
        new Notification(title, { body });
    }
}

//requestNotificationPermission();

function renderKanbanColumns(parent: HTMLElement, laneTasks: Task[]) {
    const board = document.createElement("div");
    board.className = "kanban-board";

    const statuses = ["Pending", "In Progress", "Completed"];
    const statuses_class: { [key: string]: string } = {
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
        zone?.appendChild(card);
    });

    addKanbanDropzones(board);
}

function addKanbanDropzones(board: HTMLElement) {
    const zones = board.querySelectorAll(".kanban-dropzone");

    zones.forEach((zone) => {
        zone.addEventListener("dragover", (e) => e.preventDefault());

        zone.addEventListener("drop", () => {
            const dragging = document.querySelector(".dragging") as HTMLElement;
            if (!dragging) return;

            const taskId = dragging.dataset.id;
            const newStatus = (zone as HTMLElement).dataset.status!;

            const count = tasks.filter((t) => t.status === newStatus).length;

            if (count >= WIP_LIMITS[newStatus]) {
                showNotification("WIP Limit Reached", `${newStatus} column is full`);
                return;
            }

            const task = tasks.find((t) => t.id === taskId)!;
            task.status = newStatus;

            saveToStorage();
            renderTasks();
        });
    });
}

const themeToggleBtn = document.getElementById("themeToggleBtn")!;

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

const openAddTaskBtn = document.getElementById("openAddTaskBtn")!;
const closeModalBtn = document.getElementById("closeModalBtn")!;
const taskForm = document.getElementById("taskForm") as HTMLFormElement;

openAddTaskBtn.addEventListener("click", () => {
    openAddTaskModal();
});

function openAddTaskModal() {
    modalTitle.textContent = "Add Task";

    // Clear form
    (document.getElementById("taskId") as HTMLInputElement).value = "";
    (document.getElementById("taskName") as HTMLInputElement).value = "";
    (document.getElementById("taskDescription") as HTMLTextAreaElement).value = "";
    (document.getElementById("taskLink") as HTMLInputElement).value = "";
    (document.getElementById("taskStatus") as HTMLSelectElement).value = "Pending";
    (document.getElementById("taskStartDate") as HTMLInputElement).value = "";
    (document.getElementById("taskEndDate") as HTMLInputElement).value = "";

    modal.classList.remove("hidden");
}

closeModalBtn.addEventListener("click", closeModal);

function closeModal() {
    modal.classList.add("hidden");
    clearErrors();
}

modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
});

taskForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const id = (document.getElementById("taskId") as HTMLInputElement).value;

    const task: Task = {
        id: Date.now().toString(),
        name: (document.getElementById("taskName") as HTMLInputElement).value,
        description: (document.getElementById("taskDescription") as HTMLTextAreaElement).value,
        link: (document.getElementById("taskLink") as HTMLInputElement).value,
        status: (document.getElementById("taskStatus") as HTMLSelectElement).value,
        startDate: (document.getElementById("taskStartDate") as HTMLInputElement).value,
        endDate: (document.getElementById("taskEndDate") as HTMLInputElement).value,
        comments: []
    };

    saveTask(task)

    closeModal();
    renderTasks();
});

function openEditModal(task: Task) {
    modalTitle.textContent = "Edit Task";

    (document.getElementById("taskId") as HTMLInputElement).value = task.id.toString();
    (document.getElementById("taskName") as HTMLInputElement).value = task.name;
    (document.getElementById("taskDescription") as HTMLTextAreaElement).value =
        task.description;
    (document.getElementById("taskLink") as HTMLInputElement).value = task.link;
    (document.getElementById("taskStatus") as HTMLSelectElement).value =
        task.status;
    (document.getElementById("taskStartDate") as HTMLInputElement).value =
        task.startDate;
    (document.getElementById("taskEndDate") as HTMLInputElement).value =
        task.endDate;

    modal.classList.remove("hidden");
}



const trackerModal = document.getElementById("trackerModal")!;
const openTrackerBtn = document.getElementById("openTrackerBtn")!;
const closeTrackerBtn = document.getElementById("closeTrackerBtn")!;
const saveTrackerBtn = document.getElementById("saveTrackerBtn")!;
const trackerDate = document.getElementById("trackerDate") as HTMLInputElement;
const trackerHistory = document.getElementById("trackerHistory")!;

openTrackerBtn.addEventListener("click", () => {
    trackerModal.classList.remove("hidden");

    // Default today
    if (!trackerDate.value) {
        trackerDate.value = new Date().toISOString().split("T")[0];
    }

    loadTrackerForDate();
    renderTrackerHistory();
});

closeTrackerBtn.addEventListener("click", () => {
    trackerModal.classList.add("hidden");
});

trackerDate.addEventListener("change", loadTrackerForDate);

function loadTrackerForDate() {
    const date = trackerDate.value;
    if (!date) return;

    const stored = getTrackerData();
    const record = stored[date] || [];

    document
        .querySelectorAll("#trackerModal input[type='checkbox']")
        .forEach((cb) => {
            const checkbox = cb as HTMLInputElement;
            checkbox.checked = record.includes(checkbox.value);
        });
}

saveTrackerBtn.addEventListener("click", () => {
    const date = trackerDate.value;
    if (!date) {
        alert("Select a date");
        return;
    }

    const selected: string[] = [];

    document
        .querySelectorAll("#trackerModal input[type='checkbox']:checked")
        .forEach((cb) => {
            selected.push((cb as HTMLInputElement).value);
        });

    const stored = getTrackerData();
    stored[date] = selected;

    localStorage.setItem("dailyTracker", JSON.stringify(stored));

    renderTrackerHistory();
});

function getTrackerData(): Record<string, string[]> {
    return JSON.parse(localStorage.getItem("dailyTracker") || "{}");
}

function renderTrackerHistory() {
    const stored = getTrackerData();

    trackerHistory.innerHTML = "";

    Object.entries(stored)
        .sort(([a], [b]) => (a < b ? 1 : -1)) // newest first
        .forEach(([date, items]) => {
            const div = document.createElement("div");
            div.className = "history-entry";
            div.innerHTML = `<strong>${date}</strong><br/>
                       ${items.length ? items.join(", ") : "No items completed"}`;
            trackerHistory.appendChild(div);
        });
}
