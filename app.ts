interface TaskComment {
    id: number;
    text: string;
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

const taskList = document.getElementById("taskList") as HTMLUListElement;

const nameInput = document.getElementById("name") as HTMLInputElement;
const descInput = document.getElementById("description") as HTMLInputElement;
const linkInput = document.getElementById("link") as HTMLInputElement;
const statusInput = document.getElementById("status") as HTMLSelectElement;
const startDateInput = document.getElementById("startDate") as HTMLInputElement;
const endDateInput = document.getElementById("endDate") as HTMLInputElement;

const searchName = document.getElementById("searchName") as HTMLInputElement;
const searchStatus = document.getElementById("searchStatus") as HTMLSelectElement;
const sortBy = document.getElementById("sortBy") as HTMLSelectElement;

document.getElementById("addTaskBtn")!.addEventListener("click", addTask);
searchName.addEventListener("input", renderTasks);
searchStatus.addEventListener("change", renderTasks);
sortBy.addEventListener("change", renderTasks);

function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function addTask() {
    const task: Task = {
        id: Date.now(),
        name: nameInput.value,
        description: descInput.value,
        link: linkInput.value,
        status: statusInput.value,
        startDate: startDateInput.value,
        endDate: endDateInput.value,
        comments: []
    };

    tasks.push(task);
    saveTasks();
    clearForm();
    renderTasks();
}

function clearForm() {
    nameInput.value = "";
    descInput.value = "";
    linkInput.value = "";
    startDateInput.value = "";
    endDateInput.value = "";
}

function renderTasks() {
    let filtered = [...tasks];

    if (searchName.value) {
        filtered = filtered.filter(t =>
            t.name.toLowerCase().includes(searchName.value.toLowerCase())
        );
    }

    if (searchStatus.value) {
        filtered = filtered.filter(t => t.status === searchStatus.value);
    }

    if (sortBy.value) {
        filtered.sort((a, b) =>
            (a as any)[sortBy.value].localeCompare((b as any)[sortBy.value])
        );
    }

    taskList.innerHTML = "";

    filtered.forEach(task => {
        const li = document.createElement("li");
        li.className = "task";

        li.innerHTML = `
      <strong>${task.name}</strong> (${task.status})<br/>
      ${task.description}<br/>
      <a href="${task.link}" target="_blank">${task.link}</a><br/>
      Start: ${task.startDate} | End: ${task.endDate}

      <div>
        <button onclick="editTask(${task.id})">Edit</button>
        <button onclick="deleteTask(${task.id})">Delete</button>
      </div>

      <div class="comments">
        <input id="comment-${task.id}" placeholder="Add comment"/>
        <button onclick="addComment(${task.id})">Add</button>
        <ul>
          ${task.comments.map(c => `<li>${c.text}</li>`).join("")}
        </ul>
      </div>
    `;

        taskList.appendChild(li);
    });
}

function deleteTask(id: number) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
}

function editTask(id: number) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    nameInput.value = task.name;
    descInput.value = task.description;
    linkInput.value = task.link;
    statusInput.value = task.status;
    startDateInput.value = task.startDate;
    endDateInput.value = task.endDate;

    deleteTask(id);
}

function addComment(taskId: number) {
    const input = document.getElementById(`comment-${taskId}`) as HTMLInputElement;
    const task = tasks.find(t => t.id === taskId);
    if (!task || !input.value) return;

    task.comments.push({
        id: Date.now(),
        text: input.value
    });

    input.value = "";
    saveTasks();
    renderTasks();
}

renderTasks();

// Make functions global for inline buttons
(window as any).deleteTask = deleteTask;
(window as any).editTask = editTask;
(window as any).addComment = addComment;
