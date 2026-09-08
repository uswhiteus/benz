let fuel = Number(localStorage.getItem("fuel") || 0);
let history = JSON.parse(localStorage.getItem("history") || "[]");

const fuelAmount = document.getElementById("fuelAmount");
const historyElement = document.getElementById("history");

function save() {
localStorage.setItem("fuel", fuel);
localStorage.setItem("history", JSON.stringify(history));
}

function render() {
fuelAmount.textContent = fuel.toFixed(1);

if (history.length === 0) {
    historyElement.innerHTML =
        '<p class="empty">Изменений пока нет</p>';
    return;
}

historyElement.innerHTML = history
    .slice()
    .reverse()
    .map(item => `
        <div class="history-item">
            <div>
                <div class="history-name">${item.name}</div>
                <div>${item.time}</div>
            </div>
            <div class="history-change">${item.change}</div>
        </div>
    `)
    .join("");

}

function getName() {
let name = localStorage.getItem("userName");

if (!name) {
    name = prompt("Как тебя зовут?") || "Пользователь";
    localStorage.setItem("userName", name);
}

return name;

}

function addHistory(change) {
history.push({
name: getName(),
change: change > 0 ? "+${change.toFixed(1)} л" : "${change.toFixed(1)} л",
time: new Date().toLocaleTimeString("ru-RU", {
hour: "2-digit",
minute: "2-digit"
})
});

if (history.length > 50) {
    history.shift();
}

}

function changeFuel(amount) {
fuel = Math.max(0, fuel + amount);
addHistory(amount);
save();
render();
}

function setFuel() {
const input = document.getElementById("manualAmount");
const value = Number(input.value);

if (isNaN(value) || value < 0) {
    alert("Введите корректное количество.");
    return;
}

const change = value - fuel;
fuel = value;

addHistory(change);
save();
render();

input.value = "";

}

function createRoom() {
const code = Math.random()
.toString(36)
.substring(2, 8)
.toUpperCase();

localStorage.setItem("roomCode", code);

showRoom(code);

alert(`Комната создана!\nКод: ${code}`);

}

function joinRoom() {
const input = document.getElementById("roomCode");
const code = input.value.trim().toUpperCase();

if (code.length !== 6) {
    alert("Введите 6-значный код комнаты.");
    return;
}

localStorage.setItem("roomCode", code);

showRoom(code);

alert(`Ты вошёл в комнату ${code}`);

}

function showRoom(code) {
document.getElementById("roomStatus").textContent =
"Комната ${code}";

document.getElementById("currentRoom")
    .classList.remove("hidden");

document.getElementById("roomCodeDisplay")
    .textContent = code;

}

const savedRoom = localStorage.getItem("roomCode");

if (savedRoom) {
showRoom(savedRoom);
}

render();