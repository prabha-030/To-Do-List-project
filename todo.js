function addTask() {
const input = document.getElementById("taskInput");
const task = input.value.trim();
if (task === "") {
alert("Please enter a task!");
return;
}
const li = document.createElement("li");
const taskText = document.createElement("span");
taskText.textContent = task;
// Mark task as completed
taskText.onclick = function () {
li.classList.toggle("completed");
};
// Create delete button
const deleteBtn = document.createElement("button");
deleteBtn.textContent = "Delete";
deleteBtn.className = "delete-btn";
deleteBtn.onclick = function (event) {
event.stopPropagation();
li.remove();
};
li.appendChild(taskText);
li.appendChild(deleteBtn);
document.getElementById("taskList").appendChild(li);
input.value = "";
}