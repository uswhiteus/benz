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

let tankCapacity =
    Number(localStorage.getItem("tankCapacity")) || 60;

let roomCode =
    new URLSearchParams(window.location.search).get("room") ||
    localStorage.getItem("roomCode");

let userName =
    localStorage.getItem("userName");

let unsubscribeRoom = null;
let unsubscribeHistory = null;


// ===============================
// ЭЛЕМЕНТЫ
// ===============================

const fuelAmount =
    document.getElementById("fuelAmount");

const fuelLevel =
    document.getElementById("fuelLevel");

const fuelPercent =
    document.getElementById("fuelPercent");

const historyElement =
    document.getElementById("history");

const tankCapacityInput =
    document.getElementById("tankCapacity");


// ===============================
// ЗАПУСК
// ===============================

async function start() {

    if (tankCapacityInput) {
        tankCapacityInput.value = tankCapacity;
    }


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

        await signInAnonymously(auth);


        if (roomCode) {

            roomCode =
                roomCode
                    .trim()
                    .toUpperCase();

            localStorage.setItem(
                "roomCode",
                roomCode
            );

            updateRoomUrl(roomCode);

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
            "Ошибка подключения к Firebase.\n\n" +
            error.code +
            "\n" +
            error.message
        );
    }
}


// ===============================
// URL КОМНАТЫ
// ===============================

function updateRoomUrl(code) {

    const newUrl =
        `${window.location.pathname}?room=${code}`;

    window.history.replaceState(
        {},
        "",
        newUrl
    );
}


// ===============================
// ОТОБРАЖЕНИЕ
// ===============================

function render() {

    const amount =
        Number(fuel) || 0;

    const capacity =
        Number(tankCapacity) || 60;


    fuelAmount.textContent =
        amount.toFixed(1);


    const percent =
        Math.min(
            100,
            Math.max(
                0,
                (amount / capacity) * 100
            )
        );


    if (fuelLevel) {

        fuelLevel.style.height =
            `${percent}%`;
    }


    if (fuelPercent) {

        fuelPercent.textContent =
            `${Math.round(percent)}%`;
    }
}


// ===============================
// ИЗМЕНЕНИЕ БЕНЗИНА
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
            Number(fuel) + Number(amount)
        );


    try {

        await updateFuel(
            newFuel,
            amount
        );

    } catch (error) {

        console.error(error);

        alert(
            "Не удалось сохранить изменение."
        );
    }
}


// ===============================
// УСТАНОВИТЬ БЕНЗИН
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
        value - Number(fuel);


    try {

        await updateFuel(
            value,
            change
        );

        input.value = "";

    } catch (error) {

        console.error(error);

        alert(
            "Не удалось сохранить значение."
        );
    }
}


// ===============================
// СОХРАНЕНИЕ БЕНЗИНА
// ===============================

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


    await setDoc(
        roomRef,
        {
            fuel:
                Number(newFuel),

            tankCapacity:
                Number(tankCapacity),

            updatedAt:
                Date.now(),

            updatedBy:
                userName
        },
        {
            merge: true
        }
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
}


// ===============================
// ПОДКЛЮЧЕНИЕ К КОМНАТЕ
// ===============================

function connectToRoom(code) {

    // Отключаем старые listeners

    if (unsubscribeRoom) {
        unsubscribeRoom();
    }

    if (unsubscribeHistory) {
        unsubscribeHistory();
    }


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


    const roomRef =
        doc(
            db,
            "rooms",
            roomCode
        );


    // ===========================
    // REALTIME КОМНАТЫ
    // ===========================

    unsubscribeRoom =
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


                    if (
                        data.tankCapacity
                    ) {

                        tankCapacity =
                            Number(
                                data.tankCapacity
                            );

                        localStorage.setItem(
                            "tankCapacity",
                            tankCapacity
                        );


                        if (tankCapacityInput) {

                            tankCapacityInput.value =
                                tankCapacity;
                        }
                    }


                    render();


                } else {

                    // Если комнаты нет —
                    // создаём её

                    await setDoc(
                        roomRef,
                        {
                            fuel: 0,

                            tankCapacity:
                                Number(
                                    tankCapacity
                                ),

                            updatedAt:
                                Date.now(),

                            updatedBy:
                                userName
                        }
                    );


                    fuel = 0;

                    render();
                }
            },

            (error) => {

                console.error(
                    "Room listener error:",
                    error
                );

                alert(
                    "Ошибка загрузки комнаты:\n" +
                    error.message
                );
            }
        );


    // ===========================
    // ИСТОРИЯ
    // ===========================

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


    unsubscribeHistory =
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

                console.error(
                    "History error:",
                    error
                );
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
// ПОДЕЛИТЬСЯ КОМНАТОЙ
// ===============================

async function shareRoom() {

    if (!roomCode) {

        alert(
            "Сначала подключись к комнате."
        );

        return;
    }


    const url =
        `${window.location.origin}` +
        `${window.location.pathname}` +
        `?room=${roomCode}`;


    try {

        if (
            navigator.share
        ) {

            await navigator.share({

                title:
                    "Бензин",

                text:
                    `Подключись к моей комнате ${roomCode}`,

                url:
                    url
            });

        } else {

            await navigator.clipboard.writeText(
                url
            );

            alert(
                "Ссылка скопирована!"
            );
        }

    } catch (error) {

        // Пользователь мог просто
        // закрыть окно «Поделиться»

        if (
            error.name !==
            "AbortError"
        ) {

            try {

                await navigator.clipboard.writeText(
                    url
                );

                alert(
                    "Ссылка скопирована!"
                );

            } catch {

                prompt(
                    "Скопируй ссылку:",
                    url
                );
            }
        }
    }
}


// ===============================
// ОБЪЁМ БАКА
// ===============================

async function saveTankCapacity() {

    const input =
        document.getElementById(
            "tankCapacity"
        );


    const value =
        Number(input.value);


    if (
        isNaN(value) ||
        value <= 0 ||
        value > 200
    ) {

        alert(
            "Объём бака должен быть от 1 до 200 литров."
        );

        return;
    }


    tankCapacity =
        value;


    localStorage.setItem(
        "tankCapacity",
        tankCapacity
    );


    render();


    // Если есть комната —
    // сохраняем настройку
    // для всех участников

    if (roomCode) {

        try {

            await setDoc(

                doc(
                    db,
                    "rooms",
                    roomCode
                ),

                {
                    tankCapacity:
                        tankCapacity,

                    updatedAt:
                        Date.now(),

                    updatedBy:
                        userName
                },

                {
                    merge: true
                }
            );

        } catch (error) {

            console.error(error);

            alert(
                "Не удалось сохранить объём бака."
            );

            return;
        }
    }


    alert(
        `Объём бака установлен: ${tankCapacity} л`
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

window.shareRoom =
    shareRoom;

window.saveTankCapacity =
    saveTankCapacity;


// ===============================
// ЗАПУСК
// ===============================

start();