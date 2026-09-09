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
    limit,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    getAuth,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


// ===============================
// FIREBASE
// ===============================

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


// ===============================
// СОСТОЯНИЕ
// ===============================

let fuel = 0;

let roomCode =
    new URLSearchParams(window.location.search).get("room") ||
    localStorage.getItem("roomCode");

let userName =
    localStorage.getItem("userName");


// ===============================
// ЭЛЕМЕНТЫ
// ===============================

const fuelAmount =
    document.getElementById("fuelAmount");

const historyElement =
    document.getElementById("history");


// ===============================
// ДИАГНОСТИКА
// ===============================

function debug(message) {

    console.log("[DEBUG]", message);

    let box =
        document.getElementById("debugBox");

    if (!box) {

        box = document.createElement("div");

        box.id = "debugBox";

        box.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 10px;
            right: 10px;
            background: #111;
            color: #0f0;
            padding: 12px;
            border-radius: 10px;
            font-family: monospace;
            font-size: 12px;
            z-index: 99999;
            max-height: 180px;
            overflow: auto;
            white-space: pre-wrap;
        `;

        document.body.appendChild(box);
    }

    box.textContent +=
        "\n" + message;
}


function debugError(error) {

    console.error(error);

    debug(
        "ОШИБКА: " +
        (error?.message || error)
    );
}


// ===============================
// START
// ===============================

async function start() {

    debug("APP START");

    debug(
        "URL: " +
        window.location.href
    );

    debug(
        "Комната из URL/localStorage: " +
        roomCode
    );


    // Имя пользователя

    if (!userName) {

        userName =
            prompt("Как тебя зовут?") ||
            "Пользователь";

        localStorage.setItem(
            "userName",
            userName
        );
    }

    debug(
        "Имя: " +
        userName
    );


    try {

        debug(
            "Подключаем Firebase Auth..."
        );

        await signInAnonymously(auth);

        debug(
            "Firebase Auth OK"
        );


        // Если комната найдена

        if (roomCode) {

            roomCode =
                roomCode
                    .trim()
                    .toUpperCase();

            localStorage.setItem(
                "roomCode",
                roomCode
            );

            updateRoomUrl(
                roomCode
            );

            debug(
                "Подключаемся к комнате: " +
                roomCode
            );

            connectToRoom(
                roomCode
            );

        } else {

            debug(
                "Комната не найдена"
            );

            render();
        }


    } catch (error) {

        debugError(error);

        alert(
            "Ошибка подключения к Firebase.\n\n" +
            error.message
        );
    }
}


// ===============================
// URL
// ===============================

function updateRoomUrl(code) {

    const newUrl =
        `${window.location.pathname}?room=${code}`;

    window.history.replaceState(
        {},
        "",
        newUrl
    );

    debug(
        "URL комнаты установлен: " +
        newUrl
    );
}


// ===============================
// ОТОБРАЖЕНИЕ
// ===============================

function render() {

    const amount =
        Number(fuel);

    const maxFuel =
        60;

    fuelAmount.textContent =
        amount.toFixed(1);


    const percent =
        Math.min(
            100,
            Math.max(
                0,
                (amount / maxFuel) * 100
            )
        );


    const fuelLevel =
        document.getElementById(
            "fuelLevel"
        );

    if (fuelLevel) {

        fuelLevel.style.height =
            `${percent}%`;
    }


    const fuelPercent =
        document.getElementById(
            "fuelPercent"
        );

    if (fuelPercent) {

        fuelPercent.textContent =
            `${Math.round(percent)}%`;
    }
}


// ===============================
// ИЗМЕНЕНИЕ ТОПЛИВА
// ===============================

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
            Number(fuel) +
            Number(amount)
        );


    debug(
        `Изменяем топливо: ${fuel} → ${newFuel}`
    );


    try {

        await updateFuel(
            newFuel,
            Number(amount)
        );

    } catch (error) {

        debugError(error);

        alert(
            "Ошибка изменения топлива:\n" +
            error.message
        );
    }
}


// ===============================
// УСТАНОВКА ТОЧНОГО КОЛИЧЕСТВА
// ===============================

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
        value -
        Number(fuel);


    try {

        await updateFuel(
            value,
            change
        );

        input.value = "";

    } catch (error) {

        debugError(error);

        alert(
            "Ошибка сохранения:\n" +
            error.message
        );
    }
}


// ===============================
// СОХРАНЕНИЕ В FIREBASE
// ===============================

async function updateFuel(
    newFuel,
    change
) {

    debug(
        "Сохраняем в Firebase..."
    );


    const roomRef =
        doc(
            db,
            "rooms",
            roomCode
        );


    await setDoc(
        roomRef,
        {
            fuel:
                Number(newFuel),

            updatedAt:
                Date.now(),

            updatedBy:
                userName
        },
        {
            merge: true
        }
    );


    debug(
        "Firebase: топливо сохранено = " +
        newFuel
    );


    await addDoc(
        collection(
            db,
            "rooms",
            roomCode,
            "history"
        ),
        {
            name:
                userName,

            change:
                Number(change),

            time:
                Date.now()
        }
    );


    debug(
        "История сохранена"
    );
}


// ===============================
// ПОДКЛЮЧЕНИЕ К КОМНАТЕ
// ===============================

function connectToRoom(code) {

    roomCode =
        code
            .trim()
            .toUpperCase();


    localStorage.setItem(
        "roomCode",
        roomCode
    );


    updateRoomUrl(
        roomCode
    );


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


    debug(
        "ROOM: " +
        roomCode
    );


    const roomRef =
        doc(
            db,
            "rooms",
            roomCode
        );


    // =================================
    // СНАЧАЛА ДЕЛАЕМ ОДИН ПРЯМОЙ READ
    // =================================

    getDoc(roomRef)
        .then((snapshot) => {

            debug(
                "Прямое чтение Firestore выполнено"
            );


            debug(
                "exists = " +
                snapshot.exists()
            );


            if (snapshot.exists()) {

                const data =
                    snapshot.data();


                debug(
                    "ДАННЫЕ FIREBASE:\n" +
                    JSON.stringify(
                        data,
                        null,
                        2
                    )
                );


                debug(
                    "fuel = " +
                    data.fuel
                );


                fuel =
                    Number(
                        data.fuel ?? 0
                    );


                debug(
                    "Устанавливаем fuel = " +
                    fuel
                );


                render();

            } else {

                debug(
                    "ДОКУМЕНТ КОМНАТЫ НЕ СУЩЕСТВУЕТ"
                );
            }

        })
        .catch((error) => {

            debugError(error);
        });


    // =================================
    // REALTIME LISTENER
    // =================================

    onSnapshot(

        roomRef,

        (snapshot) => {

            debug(
                "Realtime snapshot получен"
            );


            debug(
                "snapshot.exists = " +
                snapshot.exists()
            );


            if (snapshot.exists()) {

                const data =
                    snapshot.data();


                debug(
                    "Realtime data:\n" +
                    JSON.stringify(
                        data,
                        null,
                        2
                    )
                );


                fuel =
                    Number(
                        data.fuel ?? 0
                    );


                debug(
                    "Realtime fuel = " +
                    fuel
                );


                render();

            } else {

                debug(
                    "Realtime: комнаты нет"
                );
            }
        },


        (error) => {

            debugError(error);

            alert(
                "Ошибка realtime подключения:\n" +
                error.message
            );
        }
    );


    // =================================
    // ИСТОРИЯ
    // =================================

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

                        ? `+${Number(
                            data.change
                        ).toFixed(1)} л`

                        : `${Number(
                            data.change
                        ).toFixed(1)} л`;


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
                                        hour:
                                            "2-digit",

                                        minute:
                                            "2-digit"
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

            debugError(error);
        }
    );
}


// ===============================
// СОЗДАТЬ КОМНАТУ
// ===============================

function createRoom() {

    const code =
        Math.random()
            .toString(36)
            .substring(
                2,
                8
            )
            .toUpperCase();


    debug(
        "Создаём новую комнату: " +
        code
    );


    fuel = 0;


    localStorage.setItem(
        "roomCode",
        code
    );


    updateRoomUrl(
        code
    );


    connectToRoom(
        code
    );


    alert(
        `Комната создана!\nКод: ${code}`
    );
}


// ===============================
// ВОЙТИ В КОМНАТУ
// ===============================

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


    debug(
        "Входим в комнату: " +
        code
    );


    localStorage.setItem(
        "roomCode",
        code
    );


    updateRoomUrl(
        code
    );


    connectToRoom(
        code
    );


    alert(
        `Ты вошёл в комнату ${code}`
    );
}


// ===============================
// КНОПКИ
// ===============================

window.changeFuel =
    changeFuel;

window.setFuel =
    setFuel;

window.createRoom =
    createRoom;

window.joinRoom =
    joinRoom;


// ===============================
// ЗАПУСК
// ===============================

start();