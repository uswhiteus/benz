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

// Сначала пытаемся взять комнату из URL
const urlParams = new URLSearchParams(
    window.location.search
);

let roomCode =
    urlParams.get("room");

// Если в URL нет комнаты — берём из памяти браузера
if (!roomCode) {
    roomCode =
        localStorage.getItem("roomCode");
}

let userName =
    localStorage.getItem("userName");


const fuelAmount =
    document.getElementById("fuelAmount");

const historyElement =
    document.getElementById("history");


async function start() {

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

            // Сохраняем комнату локально
            localStorage.setItem(
                "roomCode",
                roomCode
            );

            // И сохраняем её в URL
            updateRoomUrl(
                roomCode
            );

            connectToRoom(
                roomCode
            );

        } else {

            render();
        }


    } catch (error) {

        console.error(
            error
        );

        alert(
            "Ошибка подключения к Firebase."
        );
    }
}


function updateRoomUrl(code) {

    const newUrl =
        `${window.location.pathname}?room=${code}`;

    window.history.replaceState(
        {},
        "",
        newUrl
    );
}


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


    const roomRef =
        doc(
            db,
            "rooms",
            roomCode
        );


    // Получаем данные комнаты
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

                // Комнаты ещё нет —
                // создаём её с 0 л
                await setDoc(
                    roomRef,
                    {
                        fuel: 0,
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


window.changeFuel =
    changeFuel;

window.setFuel =
    setFuel;

window.createRoom =
    createRoom;

window.joinRoom =
    joinRoom;


start();