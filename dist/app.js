"use strict";
let tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
const taskList = document.getElementById("taskList");
const nameInput = document.getElementById("name");
const descInput = document.getElementById("description");
const linkInput = document.getElementById("link");
const statusInput = document.getElementById("status");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const searchName = document.getElementById("searchName");
const searchStatus = document.getElementById("searchStatus");
const sortBy = document.getElementById("sortBy");
document.getElementById("addTaskBtn").addEventListener("click", addTask);
searchName.addEventListener("input", renderTasks);
searchStatus.addEventListener("change", renderTasks);
sortBy.addEventListener("change", renderTasks);
function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}
function addTask() {
    const task = {
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
        filtered = filtered.filter(t => t.name.toLowerCase().includes(searchName.value.toLowerCase()));
    }
    if (searchStatus.value) {
        filtered = filtered.filter(t => t.status === searchStatus.value);
    }
    if (sortBy.value) {
        filtered.sort((a, b) => a[sortBy.value].localeCompare(b[sortBy.value]));
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
function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
}
function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task)
        return;
    nameInput.value = task.name;
    descInput.value = task.description;
    linkInput.value = task.link;
    statusInput.value = task.status;
    startDateInput.value = task.startDate;
    endDateInput.value = task.endDate;
    deleteTask(id);
}
function addComment(taskId) {
    const input = document.getElementById(`comment-${taskId}`);
    const task = tasks.find(t => t.id === taskId);
    if (!task || !input.value)
        return;
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
window.deleteTask = deleteTask;
window.editTask = editTask;
window.addComment = addComment;
