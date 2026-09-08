import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getFirestore,
    doc,
    setDoc,
    onSnapshot,
    collection,
    addDoc,
    query,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    getAuth,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


const firebaseConfig = {
    apiKey: "AIzaSyDwcaEumdBQeaaar4lAH_hAxcTXx1nQ7v0",
    authDomain: "benz-83cac.firebaseapp.com",
    projectId: "benz-83cac",
    storageBucket: "benz-83cac.firebasestorage.app",
    messagingSenderId: "884798326345",
    appId: "1:884798326345:web:8a5e7ff77bd398fe66a198"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


let fuel = 0;
let roomCode = localStorage.getItem("roomCode");
let userName = localStorage.getItem("userName");


const fuelAmount = document.getElementById("fuelAmount");
const historyElement = document.getElementById("history");


async function start() {

    // Получаем имя пользователя
    if (!userName) {

        userName =
            prompt("Как тебя зовут?") ||
            "Пользователь";

        localStorage.setItem(
            "userName",
            userName
        );
    }


    try {

        // Авторизация Firebase
        await signInAnonymously(auth);


        // Если пользователь уже был в комнате,
        // автоматически подключаем его
        if (roomCode) {

            connectToRoom(roomCode);

        } else {

            render();
        }


    } catch (error) {

        console.error(
            "Firebase error:",
            error
        );

        alert(
            "Ошибка подключения к Firebase."
        );
    }
}


function render() {

    const amount =
        Number(fuel);


    const maxFuel = 60;


    // Количество литров
    fuelAmount.textContent =
        amount.toFixed(1);


    // Процент заполнения
    const percent =
        Math.min(
            100,
            Math.max(
                0,
                (amount / maxFuel) * 100
            )
        );


    // Индикатор
    const fuelLevel =
        document.getElementById(
            "fuelLevel"
        );


    if (fuelLevel) {

        fuelLevel.style.height =
            `${percent}%`;
    }


    // Процент
    const fuelPercent =
        document.getElementById(
            "fuelPercent"
        );


    if (fuelPercent) {

        fuelPercent.textContent =
            `${Math.round(percent)}%`;
    }
}


async function changeFuel(amount) {

    if (!roomCode) {

        alert(
            "Сначала создай или подключись к комнате."
        );

        return;
    }


    const newFuel =
        Math.max(
            0,
            Number(fuel) + Number(amount)
        );


    await updateFuel(
        newFuel,
        Number(amount)
    );
}


async function setFuel() {

    if (!roomCode) {

        alert(
            "Сначала создай или подключись к комнате."
        );

        return;
    }


    const input =
        document.getElementById(
            "manualAmount"
        );


    const value =
        Number(input.value);


    if (
        isNaN(value) ||
        value < 0
    ) {

        alert(
            "Введите корректное количество."
        );

        return;
    }


    const change =
        value - Number(fuel);


    await updateFuel(
        value,
        change
    );


    input.value = "";
}


async function updateFuel(
    newFuel,
    change
) {

    const roomRef =
        doc(
            db,
            "rooms",
            roomCode
        );


    // Сохраняем количество топлива
    await setDoc(
        roomRef,
        {
            fuel: Number(newFuel),
            updatedAt: Date.now(),
            updatedBy: userName
        },
        {
            merge: true
        }
    );


    // Записываем изменение в историю
    await addDoc(
        collection(
            db,
            "rooms",
            roomCode,
            "history"
        ),
        {
            name: userName,
            change: Number(change),
            time: Date.now()
        }
    );
}


function connectToRoom(code) {

    roomCode =
        code.toUpperCase();


    // Сохраняем комнату на телефоне
    localStorage.setItem(
        "roomCode",
        roomCode
    );


    // Показываем комнату
    document.getElementById(
        "roomStatus"
    ).textContent =
        `Комната ${roomCode}`;


    document.getElementById(
        "currentRoom"
    ).classList.remove(
        "hidden"
    );


    document.getElementById(
        "roomCodeDisplay"
    ).textContent =
        roomCode;


    const roomRef =
        doc(
            db,
            "rooms",
            roomCode
        );


    // Firebase сам:
    // 1. загрузит сохранённое значение
    // 2. будет следить за изменениями
    // 3. обновит приложение без перезагрузки
    onSnapshot(
        roomRef,
        async (snapshot) => {

            if (snapshot.exists()) {

                const data =
                    snapshot.data();


                fuel =
                    Number(
                        data.fuel ?? 0
                    );


                render();


            } else {

                // Комната ещё не существует
                await setDoc(
                    roomRef,
                    {
                        fuel: 0,
                        updatedAt: Date.now(),
                        updatedBy: userName
                    }
                );


                fuel = 0;

                render();
            }
        },
        (error) => {

            console.error(
                "Ошибка комнаты:",
                error
            );

            alert(
                "Ошибка загрузки комнаты."
            );
        }
    );


    // История
    const historyQuery =
        query(
            collection(
                db,
                "rooms",
                roomCode,
                "history"
            ),
            orderBy(
                "time",
                "desc"
            ),
            limit(50)
        );


    onSnapshot(
        historyQuery,
        (snapshot) => {

            historyElement.innerHTML =
                "";


            if (snapshot.empty) {

                historyElement.innerHTML =
                    '<p class="empty">Изменений пока нет</p>';

                return;
            }


            snapshot.forEach(
                (item) => {

                    const data =
                        item.data();


                    const div =
                        document.createElement(
                            "div"
                        );


                    div.className =
                        "history-item";


                    const change =
                        Number(
                            data.change
                        ) >= 0
                            ? `+${Number(data.change).toFixed(1)} л`
                            : `${Number(data.change).toFixed(1)} л`;


                    div.innerHTML = `
                        <div>
                            <div class="history-name">
                                ${data.name}
                            </div>

                            <div>
                                ${new Date(
                                    data.time
                                ).toLocaleTimeString(
                                    "ru-RU",
                                    {
                                        hour: "2-digit",
                                        minute: "2-digit"
                                    }
                                )}
                            </div>
                        </div>

                        <div class="history-change">
                            ${change}
                        </div>
                    `;


                    historyElement.appendChild(
                        div
                    );
                }
            );
        },
        (error) => {

            console.error(
                "Ошибка истории:",
                error
            );
        }
    );
}


function createRoom() {

    const code =
        Math.random()
            .toString(36)
            .substring(
                2,
                8
            )
            .toUpperCase();


    // Запоминаем комнату
    localStorage.setItem(
        "roomCode",
        code
    );


    // Подключаемся
    connectToRoom(
        code
    );


    alert(
        `Комната создана!\nКод: ${code}`
    );
}


function joinRoom() {

    const input =
        document.getElementById(
            "roomCode"
        );


    const code =
        input.value
            .trim()
            .toUpperCase();


    if (
        code.length !== 6
    ) {

        alert(
            "Введите 6-значный код комнаты."
        );

        return;
    }


    // Запоминаем комнату
    localStorage.setItem(
        "roomCode",
        code
    );


    // Подключаемся
    connectToRoom(
        code
    );


    alert(
        `Ты вошёл в комнату ${code}`
    );
}


// Делаем функции доступными
// для кнопок в index.html
window.changeFuel =
    changeFuel;

window.setFuel =
    setFuel;

window.createRoom =
    createRoom;

window.joinRoom =
    joinRoom;


// Запуск приложения
start();