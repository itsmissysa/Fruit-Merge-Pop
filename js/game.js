import { FRUITS, randomSmallFruit } from "./fruits.js";
import { playSound } from "./audio.js";

let canvas, ctx;
let scoreEl, coinsEl, bestEl, nextEl, pauseBtn;

let data;
let finishCallback;

let score = 0;
let coins = 0;

let currentFruit;
let nextFruit;

let board = [];
let particles = [];
let mergeEffects = [];

let dropX = 200;

const DANGER_Y = 170;

let paused = false;
let over = false;
let canDrop = true;
let gameOverSoundPlayed = false;

let raf;
let lastTime = 0;
let accumulator = 0;

const GRAVITY = 1100;
const BOUNCE = 0.10;
const FRICTION = 0.78;
const AIR_FRICTION = 0.992;

const FIXED_DT = 1 / 60;

// ======================================================
// EXPRESSION SETTINGS
// ======================================================

// Smile + Happy are the most common.
// Wow is occasional.
// Sleepy is handled separately when a fruit settles.

const FACE_TYPES = [
    "smile",
    "smile",
    "smile",
    "happy",
    "happy",
    "happy",
    "wow"
];

const FACE_CHANGE_MIN = 3.0;
const FACE_CHANGE_MAX = 7.0;

function randomFace() {

    return FACE_TYPES[
        Math.floor(
            Math.random() *
            FACE_TYPES.length
        )
    ];
}

function randomFaceTimer() {

    return (
        FACE_CHANGE_MIN +
        Math.random() *
        (
            FACE_CHANGE_MAX -
            FACE_CHANGE_MIN
        )
    );
}

function setupFace(
    f,
    forcedFace = null
) {

    if (!f) {
        return;
    }

    f.faceMode =
        forcedFace ||
        randomFace();

    f.faceTimer =
        randomFaceTimer();

    f.blinkTimer =
        1.5 +
        Math.random() * 3;

    f.blinking =
        false;

    f.expressionPulse =
        0;

    f.sleeping =
        false;

    f.sleepTimer =
        0;
}

function updateFace(
    f,
    dt
) {

    if (!f) {
        return;
    }

    // ==================================================
    // SLEEPING FRUIT
    // ==================================================

    if (f.sleeping) {

        f.faceMode =
            "sleepy";

        return;
    }

    // ==================================================
    // EXPRESSION TIMER
    // ==================================================

    if (
        typeof f.faceTimer !==
        "number"
    ) {

        setupFace(f);
    }

    f.faceTimer -=
        dt;

    if (
        f.faceTimer <= 0
    ) {

        // Pick another expression.
        // Avoid immediately repeating
        // the exact same expression.

        let newFace =
            randomFace();

        let attempts = 0;

        while (
            newFace === f.faceMode &&
            attempts < 5
        ) {

            newFace =
                randomFace();

            attempts++;
        }

        f.faceMode =
            newFace;

        f.faceTimer =
            randomFaceTimer();

        f.expressionPulse =
            1;
    }

    // ==================================================
    // BLINK
    // ==================================================

    if (
        typeof f.blinkTimer !==
        "number"
    ) {

        f.blinkTimer =
            2 +
            Math.random() * 3;
    }

    f.blinkTimer -=
        dt;

    if (
        f.blinkTimer <= 0 &&
        !f.blinking
    ) {

        f.blinking =
            true;

        setTimeout(() => {

            if (f) {
                f.blinking =
                    false;
            }

        }, 120);

        f.blinkTimer =
            1.8 +
            Math.random() * 4;
    }

    // ==================================================
    // EXPRESSION PULSE
    // ==================================================

    if (
        typeof f.expressionPulse !==
        "number"
    ) {

        f.expressionPulse =
            0;
    }

    f.expressionPulse =
        Math.max(
            0,
            f.expressionPulse -
            dt * 2.5
        );
}

// ======================================================
// FRUIT VISUAL SCALE
// ======================================================

function getFruitRadius(type) {
    if (!type) {
        return 20;
    }

    return Math.min(
        type.radius,
        Math.max(
            20,
            canvas.width * 0.19
        )
    );
}

// ======================================================
// INITIALIZE
// ======================================================

export function initGame(
    refs,
    saveData,
    done
) {
    // Safety check: make sure the game canvas exists before starting.
    if (!refs || !refs.canvas) {
        console.error("Fruity Merge Pop: gameCanvas was not found.");
        return;
    }

    canvas = refs.canvas;

    ctx =
        canvas.getContext("2d");

    if (!ctx) {
        console.error("Fruity Merge Pop: could not create 2D canvas context.");
        return;
    }

    ctx.imageSmoothingEnabled =
        true;

    scoreEl = refs.score;
    coinsEl = refs.coins;
    bestEl = refs.best;
    nextEl = refs.next;
    pauseBtn = refs.pause;

    data = saveData;

    finishCallback = done;

    // ==================================================
    // GOLDEN FRUIT TRACKER
    // ==================================================

    if (
        typeof data.goldenFruitCreated !==
        "boolean"
    ) {
        data.goldenFruitCreated = false;
    }

    bind();

    startGame();
}

// ======================================================
// INPUT
// ======================================================

function bind() {

    // ==================================================
    // MOUSE
    // ==================================================

    canvas.onmousemove = e => {
        setDrop(e.clientX);
    };

    canvas.onclick = () => {
        drop();
    };


   // ==================================================
// 📱 TOUCH — SUika STYLE
// ==================================================

canvas.ontouchstart = e => {

    e.preventDefault();

    if (
        paused ||
        over
    ) {
        return;
    }

    setDrop(
        e.touches[0].clientX
    );
};


canvas.ontouchmove = e => {

    e.preventDefault();

    if (
        paused ||
        over
    ) {
        return;
    }

    setDrop(
        e.touches[0].clientX
    );
};


canvas.ontouchend = e => {

    e.preventDefault();

    if (
        paused ||
        over
    ) {
        return;
    }

    drop();
};

    // ==================================================
    // PAUSE BUTTON
    // ==================================================

    if (pauseBtn) {

        pauseBtn.onclick = () => {

            if (over) {
                return;
            }

            paused = true;

            playSound("pause");

            pauseBtn.textContent = "▶";

            showResumeButton();
        };
    }


    // ==================================================
    // RESTART BUTTON
    // ==================================================

    const restartButton =
        document.getElementById(
            "restartButton"
        );

    if (restartButton) {

        restartButton.onclick = () => {

            hideResumeButton();

            startGame();
        };
    }
}


// ======================================================
// 🍓 SHOW RESUME BUTTON
// ======================================================

function showResumeButton() {

    let resumeButton =
        document.getElementById(
            "resumeGameButton"
        );


    // ==================================================
    // CREATE ONLY ONCE
    // ==================================================

    if (!resumeButton) {

        resumeButton =
            document.createElement(
                "button"
            );

        resumeButton.id =
            "resumeGameButton";

        resumeButton.textContent =
            "▶ RESUME";


        // ==================================================
        // POSITION
        // ==================================================

        resumeButton.style.position =
            "absolute";

        resumeButton.style.left =
            "50%";

        resumeButton.style.top =
            "50%";

        resumeButton.style.transform =
            "translate(-50%, -50%)";

        resumeButton.style.zIndex =
            "9999";


        // ==================================================
        // SIZE
        // ==================================================

        resumeButton.style.minWidth =
            "155px";

        resumeButton.style.minHeight =
            "52px";

        resumeButton.style.padding =
            "12px 24px";


        // ==================================================
        // STYLE
        // ==================================================

        resumeButton.style.background =
            "linear-gradient(135deg, #ff8fab, #ff5f7e)";

        resumeButton.style.color =
            "#ffffff";

        resumeButton.style.border =
            "3px solid rgba(255,255,255,0.65)";

        resumeButton.style.borderRadius =
            "20px";

        resumeButton.style.fontFamily =
            '"Quicksand", sans-serif';

        resumeButton.style.fontSize =
            "18px";

        resumeButton.style.fontWeight =
            "800";

        resumeButton.style.letterSpacing =
            "0.6px";

        resumeButton.style.boxShadow =
            `
            0 8px 0 rgba(185,55,85,0.45),
            0 12px 24px rgba(0,0,0,0.22),
            inset 0 2px 0 rgba(255,255,255,0.45)
            `;

        resumeButton.style.cursor =
            "pointer";

        resumeButton.style.userSelect =
            "none";


        // ==================================================
        // RESUME
        // ==================================================

        resumeButton.onclick = e => {

            e.preventDefault();

            e.stopPropagation();

            if (over) {
                return;
            }

            // ------------------------------------------
            // RESUME GAME
            // ------------------------------------------

            paused = false;

            playSound("pause");

            pauseBtn.textContent =
                "⏸";

            hideResumeButton();

            lastTime =
                performance.now();

            accumulator = 0;
        };


        // ==================================================
        // ADD TO GAME SCREEN
        // ==================================================

        const gameScreen =
            document.getElementById(
                "gameScreen"
            );

        if (gameScreen) {

            gameScreen.appendChild(
                resumeButton
            );

        } else {

            document.body.appendChild(
                resumeButton
            );
        }
    }


    // ==================================================
    // SHOW
    // ==================================================

    resumeButton.style.display =
        "flex";

    resumeButton.style.alignItems =
        "center";

    resumeButton.style.justifyContent =
        "center";
}


// ======================================================
// 🍓 HIDE RESUME BUTTON
// ======================================================

function hideResumeButton() {

    const resumeButton =
        document.getElementById(
            "resumeGameButton"
        );

    if (resumeButton) {

        resumeButton.style.display =
            "none";
    }
}


// ======================================================
// DROP POSITION
// ======================================================

function setDrop(clientX) {

    const r =
        canvas.getBoundingClientRect();

    dropX =
        (clientX - r.left) *
        canvas.width /
        r.width;
}

// ======================================================
// START GAME
// ======================================================

function startGame() {

    cancelAnimationFrame(raf);

    score = 0;
    coins = 0;

    board = [];
    particles = [];
    mergeEffects = [];

    paused = false;
    over = false;
    canDrop = true;

    gameOverSoundPlayed = false;

    accumulator = 0;

    if (pauseBtn) {
        pauseBtn.textContent = "⏸";
    }

    // ==================================================
    // NEW FRUITS
    // ==================================================

    currentFruit =
        randomSmallFruit();

    nextFruit =
        randomSmallFruit();

    // ==================================================
    // DROP POSITION
    // ==================================================

    dropX =
        canvas.width / 2;

    // ==================================================
    // UPDATE UI
    // ==================================================

    updateUI();

    // ==================================================
    // START LOOP
    // ==================================================

    lastTime =
        performance.now();

    raf =
        requestAnimationFrame(
            loop
        );
}

// ======================================================
// DROP
// ======================================================

function drop() {
    if (
        !canDrop ||
        paused ||
        over
    ) {
        return;
    }

    const r =
        getFruitRadius(
            currentFruit
        );

    dropX = Math.max(
        r,
        Math.min(
            canvas.width - r,
            dropX
        )
    );

    const fruit = {
        x: dropX,
        y: 45,
        vx: 0,
        vy: 0,
        age: 0,
        dangerTimer: 0,
        angle: 0,
        angularVelocity: 0,
        type: currentFruit,
        sleeping: false,
        sleepTimer: 0
    };

    setupFace(
        fruit,
        randomFace()
    );

    board.push(
        fruit
    );

    playSound("drop");

    currentFruit =
        nextFruit;

    nextFruit =
        randomSmallFruit();

    canDrop = false;

    setTimeout(() => {
        canDrop = true;
    }, 300);

    updateUI();
}

// ======================================================
// 💾 SAVE / CONTINUE GAME SYSTEM
// ======================================================

const SAVED_GAME_KEY = "fruitMergeSavedGame";

// ------------------------------------------------------
// SAVE CURRENT GAME
// ------------------------------------------------------

function saveGame() {

    // Do not save an already finished game
    if (over) {
        return false;
    }

    const savedGame = {

        version: 1,

        // ----------------------------------------------
        // GAME SCORE
        // ----------------------------------------------

        score:
            score,

        coins:
            coins,

        // ----------------------------------------------
        // CURRENT / NEXT FRUIT
        // ----------------------------------------------

        currentFruit:
            currentFruit
                ? currentFruit.name
                : null,

        nextFruit:
            nextFruit
                ? nextFruit.name
                : null,

        // ----------------------------------------------
        // DROP POSITION
        // ----------------------------------------------

        dropX:
            dropX,

        // ----------------------------------------------
        // GAME STATE
        // ----------------------------------------------

        paused:
            false,

        over:
            false,

        canDrop:
            canDrop,

        // ----------------------------------------------
        // BOARD
        // ----------------------------------------------

        board:
            board.map(f => ({

                x:
                    f.x,

                y:
                    f.y,

                vx:
                    f.vx,

                vy:
                    f.vy,

                age:
                    f.age || 0,

                dangerTimer:
                    f.dangerTimer || 0,

                type:
                    f.type
                        ? f.type.name
                        : null,

                angle:
                    f.angle || 0,

                angularVelocity:
                    f.angularVelocity || 0,

                sleeping:
                    !!f.sleeping,

                sleepTimer:
                    f.sleepTimer || 0,

                faceMode:
                    f.faceMode ||
                    "smile",

                faceTimer:
                    f.faceTimer || 0,

                blinkTimer:
                    f.blinkTimer || 0,

                blinking:
                    !!f.blinking,

                expressionPulse:
                    f.expressionPulse || 0

            })),

        // ----------------------------------------------
        // TIMESTAMP
        // ----------------------------------------------

        savedAt:
            Date.now()
    };

    try {

        localStorage.setItem(
            SAVED_GAME_KEY,
            JSON.stringify(savedGame)
        );

        return true;

    } catch (error) {

        console.error(
            "Could not save game:",
            error
        );

        return false;
    }
}


// ------------------------------------------------------
// CHECK IF SAVED GAME EXISTS
// ------------------------------------------------------

function hasSavedGame() {

    try {

        const saved =
            localStorage.getItem(
                SAVED_GAME_KEY
            );

        if (!saved) {
            return false;
        }

        const game =
            JSON.parse(saved);

        return (
            game &&
            Array.isArray(game.board) &&
            game.board.length >= 0
        );

    } catch (error) {

        console.error(
            "Could not check saved game:",
            error
        );

        return false;
    }
}


// ------------------------------------------------------
// GET SAVED GAME
// ------------------------------------------------------

function getSavedGame() {

    try {

        const saved =
            localStorage.getItem(
                SAVED_GAME_KEY
            );

        if (!saved) {
            return null;
        }

        return JSON.parse(saved);

    } catch (error) {

        console.error(
            "Could not read saved game:",
            error
        );

        return null;
    }
}


// ------------------------------------------------------
// DELETE SAVED GAME
// ------------------------------------------------------

function deleteSavedGame() {

    try {

        localStorage.removeItem(
            SAVED_GAME_KEY
        );

    } catch (error) {

        console.error(
            "Could not delete saved game:",
            error
        );
    }
}


// ------------------------------------------------------
// FIND FRUIT TYPE BY NAME
// ------------------------------------------------------

function findFruitTypeByName(name) {

    if (!name) {
        return null;
    }

    return FRUITS.find(
        fruit =>
            fruit.name === name
    ) || null;
}


// ------------------------------------------------------
// CONTINUE SAVED GAME
// ------------------------------------------------------

function continueSavedGame() {

    const saved =
        getSavedGame();

    if (!saved) {
        return false;
    }

    try {

        // ----------------------------------------------
        // RESTORE SCORE
        // ----------------------------------------------

        score =
            typeof saved.score === "number"
                ? saved.score
                : 0;

        // ----------------------------------------------
        // RESTORE CURRENT FRUIT
        // ----------------------------------------------

        currentFruit =
            findFruitTypeByName(
                saved.currentFruit
            );

        // ----------------------------------------------
        // RESTORE NEXT FRUIT
        // ----------------------------------------------

        nextFruit =
            findFruitTypeByName(
                saved.nextFruit
            );

        // Safety fallback

        if (!currentFruit) {

            currentFruit =
                randomSmallFruit();
        }

        if (!nextFruit) {

            nextFruit =
                randomSmallFruit();
        }

        // ----------------------------------------------
        // RESTORE DROP POSITION
        // ----------------------------------------------

        dropX =
            typeof saved.dropX === "number"
                ? saved.dropX
                : canvas.width / 2;

        // ----------------------------------------------
        // RESTORE BOARD
        // ----------------------------------------------

        board = [];

        if (
            Array.isArray(
                saved.board
            )
        ) {

            for (
                const savedFruit
                of saved.board
            ) {

                const type =
                    findFruitTypeByName(
                        savedFruit.type
                    );

                if (!type) {
                    continue;
                }

                board.push({

                    x:
                        savedFruit.x,

                    y:
                        savedFruit.y,

                    vx:
                        savedFruit.vx,

                    vy:
                        savedFruit.vy,

                    age:
                        savedFruit.age || 0,

                    dangerTimer:
                        savedFruit.dangerTimer || 0,

                    type:
                        type,

                    angle:
                        savedFruit.angle || 0,

                    angularVelocity:
                        savedFruit.angularVelocity || 0,

                    sleeping:
                        !!savedFruit.sleeping,

                    sleepTimer:
                        savedFruit.sleepTimer || 0,

                    faceMode:
                        savedFruit.faceMode ||
                        "smile",

                    faceTimer:
                        savedFruit.faceTimer || 0,

                    blinkTimer:
                        savedFruit.blinkTimer || 0,

                    blinking:
                        !!savedFruit.blinking,

                    expressionPulse:
                        savedFruit.expressionPulse || 0

                });
            }
        }

        // ----------------------------------------------
        // RESTORE GAME STATE
        // ----------------------------------------------

        paused = false;

        over = false;

        canDrop = true;

        gameOverSoundPlayed = false;

        // ----------------------------------------------
        // RESTORE LAST FRAME TIMER
        // ----------------------------------------------

        lastTime =
            performance.now();

        accumulator = 0;

        // ----------------------------------------------
        // UPDATE UI
        // ----------------------------------------------

        updateUI();

        return true;

    } catch (error) {

        console.error(
            "Could not continue saved game:",
            error
        );

        return false;
    }
}


// ------------------------------------------------------
// 🔄 RESTART GAME
// ------------------------------------------------------

function restartSavedGame() {

    // Delete saved game first

    deleteSavedGame();

    // ----------------------------------------------
    // CLEAR BOARD
    // ----------------------------------------------

    board = [];

    // ----------------------------------------------
    // RESET SCORE
    // ----------------------------------------------

    score = 0;

    coins = 0;

    // ----------------------------------------------
    // RESET GAME STATE
    // ----------------------------------------------

    paused = false;

    over = false;

    canDrop = true;

    gameOverSoundPlayed = false;

    // ----------------------------------------------
    // RESET DROP POSITION
    // ----------------------------------------------

    dropX =
        canvas.width / 2;

    // ----------------------------------------------
    // NEW FRUITS
    // ----------------------------------------------

    currentFruit =
        randomSmallFruit();

    nextFruit =
        randomSmallFruit();

    // ----------------------------------------------
    // RESET TIMER
    // ----------------------------------------------

    lastTime =
        performance.now();

    accumulator = 0;

    // ----------------------------------------------
    // UPDATE UI
    // ----------------------------------------------

    updateUI();

    return true;
}


// ------------------------------------------------------
// SAVE + EXIT
// ------------------------------------------------------

function saveAndExitGame() {

    const saved =
        saveGame();

    if (!saved) {
        return false;
    }

    // Stop animation loop

    cancelAnimationFrame(
        raf
    );

    paused = true;

    return true;
}

// ======================================================
// UI
// ======================================================

function updateUI() {
    if (scoreEl) {
        scoreEl.textContent =
            score;
    }

    if (coinsEl) {
        coinsEl.textContent =
            (data.coins || 0) +
            coins;
    }

    if (bestEl) {
        bestEl.textContent =
            data.highScore || 0;
    }

    if (nextEl && nextFruit) {
        nextEl.textContent =
            nextFruit.emoji;
    }
}

// ======================================================
// PHYSICS UPDATE
// ======================================================

function update(dt) {
    const subSteps = 2;

    const step =
        dt / subSteps;

    for (
        let s = 0;
        s < subSteps;
        s++
    ) {
        updatePhysics(step);

        for (
            let pass = 0;
            pass < 3;
            pass++
        ) {
            const merged =
                resolveCollisions();

            if (merged) {
                break;
            }
        }
    }

    updateParticles();
    updateMergeEffects(dt);

    for (
        const f of board
    ) {
        updateFace(
            f,
            dt
        );
    }

    checkGameOver();
}

// ======================================================
// PHYSICS
// ======================================================

function updatePhysics(dt) {
    for (const f of board) {
        f.age =
            (f.age || 0) +
            dt;

        if (f.sleeping) {
            continue;
        }

        const r =
            getFruitRadius(
                f.type
            );

        // ==================================================
        // GRAVITY
        // ==================================================

        f.vy +=
            GRAVITY * dt;

        // ==================================================
        // MOVEMENT
        // ==================================================

        f.x +=
            f.vx * dt;

        f.y +=
            f.vy * dt;

        // ==================================================
        // AIR RESISTANCE
        // ==================================================

        f.vx *=
            Math.pow(
                AIR_FRICTION,
                dt * 60
            );

        // ==================================================
        // ROTATION
        // ==================================================

        f.angle +=
            f.angularVelocity *
            dt;

        f.angularVelocity *=
            Math.pow(
                0.78,
                dt * 60
            );

        f.angularVelocity =
            Math.max(
                -0.75,
                Math.min(
                    0.75,
                    f.angularVelocity
                )
            );

        // ==================================================
        // LEFT WALL
        // ==================================================

        if (
            f.x - r < 0
        ) {
            f.x = r;

            if (
                Math.abs(f.vx) >
                20
            ) {
                f.vx =
                    Math.abs(f.vx) *
                    BOUNCE;
            } else {
                f.vx = 0;
            }

            f.angularVelocity *=
                0.65;
        }

        // ==================================================
        // RIGHT WALL
        // ==================================================

        if (
            f.x + r >
            canvas.width
        ) {
            f.x =
                canvas.width - r;

            if (
                Math.abs(f.vx) >
                20
            ) {
                f.vx =
                    -Math.abs(f.vx) *
                    BOUNCE;
            } else {
                f.vx = 0;
            }

            f.angularVelocity *=
                0.65;
        }

        // ==================================================
        // FLOOR
        // ==================================================

        if (
            f.y + r >=
            canvas.height
        ) {
            f.y =
                canvas.height - r;

            if (
                Math.abs(f.vy) > 80
            ) {
                f.vy =
                    -Math.abs(f.vy) *
                    BOUNCE;
            } else {
                f.vy = 0;
            }

            f.vx *=
                FRICTION;

            f.angularVelocity *=
                0.72;

            if (
                Math.abs(f.vx) <
                7
            ) {
                f.vx = 0;
            }
        }

        // ==================================================
        // KEEP INSIDE
        // ==================================================

        f.x = Math.max(
            r,
            Math.min(
                canvas.width - r,
                f.x
            )
        );

        if (
            f.y - r < 0
        ) {
            f.y = r;

            if (f.vy < 0) {
                f.vy *=
                    -0.1;
            }
        }

        // ==================================================
        // SETTLING
        // ==================================================

        const speed =
            Math.hypot(
                f.vx,
                f.vy
            );

        const rotationSpeed =
            Math.abs(
                f.angularVelocity
            );

        let supported =
            false;

        // FLOOR SUPPORT

        if (
            f.y + r >=
            canvas.height - 2
        ) {
            supported = true;
        }

        // FRUIT SUPPORT

        if (!supported) {
            for (
                const other of board
            ) {
                if (
                    other === f
                ) {
                    continue;
                }

                const otherR =
                    getFruitRadius(
                        other.type
                    );

                const dx =
                    f.x -
                    other.x;

                const dy =
                    f.y -
                    other.y;

                const distance =
                    Math.hypot(
                        dx,
                        dy
                    );

                const minimumDistance =
                    r + otherR;

                if (
                    distance <=
                    minimumDistance + 2
                ) {
                    if (
                        other.y >
                        f.y
                    ) {
                        supported = true;
                        break;
                    }
                }
            }
        }

        // SETTLE

        if (
            supported &&
            speed < 18 &&
            rotationSpeed < 0.20
        ) {
            f.sleepTimer +=
                dt;

            if (
                f.sleepTimer >
                0.30
            ) {
                f.vx = 0;
                f.vy = 0;
                f.angularVelocity = 0;
                f.sleeping = true;

                // Sleeping fruits automatically
                // switch to sleepy expression.

                f.faceMode =
                    "sleepy";

                f.faceTimer =
                    randomFaceTimer();
            }
        } else {
            f.sleepTimer = 0;
            f.sleeping = false;
        }
    }
}

// ======================================================
// COLLISIONS
// ======================================================

function resolveCollisions() {
    for (
        let i = 0;
        i < board.length;
        i++
    ) {
        for (
            let j = i + 1;
            j < board.length;
            j++
        ) {
            const a =
                board[i];

            const b =
                board[j];

            const dx =
                b.x - a.x;

            const dy =
                b.y - a.y;

            let distance =
                Math.hypot(
                    dx,
                    dy
                );

            const aRadius =
                getFruitRadius(
                    a.type
                );

            const bRadius =
                getFruitRadius(
                    b.type
                );

            const minDistance =
                aRadius +
                bRadius;

            if (
                distance >=
                minDistance
            ) {
                continue;
            }

            if (
                distance < 0.001
            ) {
                distance =
                    0.001;
            }

            // ==================================================
            // MERGE
            // ==================================================

            if (
                a.type === b.type
            ) {
                const merged =
                    merge(a, b);

                if (merged) {
                    return true;
                }
            }

            // ==================================================
            // NORMAL COLLISION
            // ==================================================

            const nx =
                dx / distance;

            const ny =
                dy / distance;

            const overlap =
                minDistance -
                distance;

            const correction =
                overlap / 2;

            a.x -=
                nx * correction;

            a.y -=
                ny * correction;

            b.x +=
                nx * correction;

            b.y +=
                ny * correction;

            // Relative velocity

            const relativeVelocityX =
                b.vx - a.vx;

            const relativeVelocityY =
                b.vy - a.vy;

            const velocityAlongNormal =
                relativeVelocityX * nx +
                relativeVelocityY * ny;

            if (
                velocityAlongNormal > 0
            ) {
                wakeFruitWithExpression(a);
                wakeFruitWithExpression(b);

                continue;
            }

            // ==================================================
            // BOUNCE
            // ==================================================

            const restitution =
                0.18;

            const impulse =
                -(1 + restitution) *
                velocityAlongNormal /
                2;

            const impulseX =
                impulse * nx;

            const impulseY =
                impulse * ny;

            a.vx -=
                impulseX;

            a.vy -=
                impulseY;

            b.vx +=
                impulseX;

            b.vy +=
                impulseY;

            // ==================================================
            // FRICTION
            // ==================================================

            const tx =
                -ny;

            const ty =
                nx;

            const tangentVelocity =
                relativeVelocityX *
                tx +
                relativeVelocityY *
                ty;

            const frictionImpulse =
                tangentVelocity *
                0.08;

            a.vx +=
                tx *
                frictionImpulse;

            a.vy +=
                ty *
                frictionImpulse;

            b.vx -=
                tx *
                frictionImpulse;

            b.vy -=
                ty *
                frictionImpulse;

            // ==================================================
            // ROLL
            // ==================================================

            const rollingAmount =
                tangentVelocity *
                0.004;

            a.angularVelocity -=
                rollingAmount;

            b.angularVelocity +=
                rollingAmount;

            a.angularVelocity =
                Math.max(
                    -1.2,
                    Math.min(
                        1.2,
                        a.angularVelocity
                    )
                );

            b.angularVelocity =
                Math.max(
                    -1.2,
                    Math.min(
                        1.2,
                        b.angularVelocity
                    )
                );

            // ==================================================
            // WAKE + WOW EXPRESSION
            // ==================================================

            wakeFruitWithExpression(a);
            wakeFruitWithExpression(b);

            keepInside(a);
            keepInside(b);
        }
    }

    return false;
}

function wakeFruitWithExpression(f) {

    if (!f) {
        return;
    }

    f.sleeping =
        false;

    f.sleepTimer =
        0;

    // Fruit gets surprised when
    // something bumps into it.

    f.faceMode =
        "wow";

    f.faceTimer =
        0.9;

    f.expressionPulse =
        1;

    f.blinking =
        false;
}

// ======================================================
// KEEP INSIDE CANVAS
// ======================================================

function keepInside(f) {
    const r =
        getFruitRadius(
            f.type
        );

    if (
        f.x - r < 0
    ) {
        f.x = r;

        if (f.vx < 0) {
            f.vx *=
                -BOUNCE;
        }
    }

    if (
        f.x + r >
        canvas.width
    ) {
        f.x =
            canvas.width - r;

        if (f.vx > 0) {
            f.vx *=
                -BOUNCE;
        }
    }

    if (
        f.y + r >
        canvas.height
    ) {
        f.y =
            canvas.height - r;

        if (f.vy > 0) {
            f.vy *=
                -BOUNCE;
        }
    }

    if (
        f.y - r < 0
    ) {
        f.y = r;

        if (f.vy < 0) {
            f.vy *=
                -BOUNCE;
        }
    }
}

// ======================================================
// MERGE
// ======================================================

function merge(a, b) {
    const i =
        FRUITS.indexOf(
            a.type
        );

    // ==================================================
    // MAXIMUM FRUIT
    // ==================================================

    if (
        i >=
        FRUITS.length - 1
    ) {
        return false;
    }

    const newType =
        FRUITS[i + 1];

    const x =
        (a.x + b.x) / 2;

    const y =
        (a.y + b.y) / 2;

    const vx =
        (a.vx + b.vx) / 2;

    const vy =
        (a.vy + b.vy) / 2;

    board =
        board.filter(
            f =>
                f !== a &&
                f !== b
        );

    const newFruit = {
        x,

        y:
            y - 3,

        vx:
            vx * 0.5,

        vy:
            Math.min(
                vy,
                -90
            ),

        age: 0,

        dangerTimer: 0,

        type:
            newType,

        angle: 0,

        angularVelocity:
            (
                a.angularVelocity +
                b.angularVelocity
            ) * 0.05,

        sleeping: false,

        sleepTimer: 0,

        // New fruit starts with WOW
        // after being created.

        faceMode:
            "wow",

        faceTimer:
            1.15,

        blinkTimer:
            2.5,

        blinking: false,

        expressionPulse:
            1
    };

    board.push(
        newFruit
    );

    // ==================================================
    // SCORE
    // ==================================================

    score +=
        newType.points;

    // ==================================================
    // COINS
    // ==================================================

    coins +=
        Math.max(
            1,
            Math.floor(
                newType.points / 20
            )
        );

    // ==================================================
    // DATA
    // ==================================================

    if (
        typeof data.totalMerges !==
        "number"
    ) {
        data.totalMerges = 0;
    }

    data.totalMerges++;

    if (
        typeof data.totalScore !==
        "number"
    ) {
        data.totalScore = 0;
    }

    data.totalScore +=
        newType.points;

    // ==================================================
    // BEST FRUIT
    // ==================================================

    if (
        typeof data.bestFruit !==
        "number"
    ) {
        data.bestFruit = 0;
    }

    data.bestFruit =
        Math.max(
            data.bestFruit,
            i + 1
        );

    // ==================================================
    // GOLDEN FRUIT TRACKER
    // ==================================================

    if (
        newType.name ===
        "Golden Fruit"
    ) {
        data.goldenFruitCreated =
            true;
    }

    // ==================================================
    // HIGH SCORE
    // ==================================================

    if (
        score >
        (data.highScore || 0)
    ) {
        data.highScore =
            score;
    }

    // ==================================================
    // MERGE PARTICLES
    // ==================================================

    spawnParticles(
        x,
        y,
        newType.color
    );

    spawnSparkles(
        x,
        y
    );

    mergeEffects.push({
        x,
        y,
        age: 0,
        duration: 0.42,
        radius:
            Math.max(
                18,
                getFruitRadius(
                    newType
                ) * 0.34
            ),
        color:
            newType.color
    });

    // ==================================================
    // MERGE SOUND
    // ==================================================

    playSound("merge");

    updateUI();

    return true;
}

// ======================================================
// PARTICLES
// ======================================================

function spawnParticles(
    x,
    y,
    color
) {
    for (
        let i = 0;
        i < 12;

             i++
    ) {
        const angle =
            Math.random() *
            Math.PI *
            2;

        const speed =
            Math.random() *
            3 +
            1;

        particles.push({
            x,
            y,

            vx:
                Math.cos(angle) *
                speed,

            vy:
                Math.sin(angle) *
                speed,

            size:
                Math.random() *
                4 +
                2,

            life: 1,

            color
        });
    }
}

// ======================================================
// SPARKLES
// ======================================================

function spawnSparkles(
    x,
    y
) {
    for (
        let i = 0;
        i < 7;
        i++
    ) {
        const angle =
            Math.random() *
            Math.PI *
            2;

        const distance =
            Math.random() *
            18 +
            8;

        particles.push({
            x:
                x +
                Math.cos(angle) *
                distance,

            y:
                y +
                Math.sin(angle) *
                distance,

            vx:
                Math.cos(angle) *
                0.5,

            vy:
                Math.sin(angle) *
                0.5,

            size:
                Math.random() *
                3 +
                2,

            life: 1,

            color:
                "#fff4a3"
        });
    }
}

// ======================================================
// UPDATE PARTICLES
// ======================================================

function updateParticles() {
    for (
        let i =
            particles.length - 1;
        i >= 0;
        i--
    ) {
        const p =
            particles[i];

        p.x +=
            p.vx;

        p.y +=
            p.vy;

        p.vy +=
            0.1;

        p.life -=
            0.04;

        if (
            p.life <= 0
        ) {
            particles.splice(
                i,
                1
            );
        }
    }
}

// ======================================================
// MERGE EFFECTS
// ======================================================

function updateMergeEffects(dt) {
    for (
        let i =
            mergeEffects.length - 1;
        i >= 0;
        i--
    ) {
        const e =
            mergeEffects[i];

        e.age +=
            dt;

        if (
            e.age >=
            e.duration
        ) {
            mergeEffects.splice(
                i,
                1
            );
        }
    }
}

function drawMergeEffects() {
    for (
        const e of mergeEffects
    ) {
        const t =
            Math.min(
                1,
                e.age /
                e.duration
            );

        const ease =
            1 -
            Math.pow(
                1 - t,
                3
            );

        const alpha =
            1 - t;

        ctx.save();

        ctx.globalAlpha =
            alpha * 0.65;

        ctx.strokeStyle =
            e.color;

        ctx.lineWidth =
            Math.max(
                2,
                e.radius * 0.07
            );

        ctx.beginPath();

        ctx.arc(
            e.x,
            e.y,
            e.radius +
                ease *
                e.radius *
                1.45,
            0,
            Math.PI * 2
        );

        ctx.stroke();

        ctx.globalAlpha =
            alpha;

        for (
            let i = 0;
            i < 8;
            i++
        ) {
            const angle =
                i *
                Math.PI /
                4 +
                t *
                0.7;

            const distance =
                e.radius *
                (
                    0.72 +
                    ease *
                    1.25
                );

            drawStar(
                e.x +
                    Math.cos(angle) *
                    distance,

                e.y +
                    Math.sin(angle) *
                    distance,

                Math.max(
                    2,
                    e.radius *
                    0.10 *
                    (
                        1 -
                        t *
                        0.4
                    )
                )
            );
        }

        ctx.restore();
    }
}

// ======================================================
// DRAW FRUIT
// ======================================================

function drawFruit(f) {
    const x =
        f.x;

    const y =
        f.y;

    const r =
        getFruitRadius(
            f.type
        );

    ctx.save();

    ctx.translate(
        x,
        y
    );

    ctx.rotate(
        f.angle || 0
    );

    // Cute tiny bounce when expressing
    if (
        f.expressionPulse > 0
    ) {
        const pulse =
            Math.sin(
                f.expressionPulse *
                Math.PI
            ) *
            0.025;

        ctx.scale(
            1 + pulse,
            1 - pulse
        );
    }

    // ==================================================
    // FRUIT STYLE
    // ==================================================

    switch (
        f.type.name
    ) {
        case "Cherry":
            drawCherry(r, f);
            break;

        case "Strawberry":
            drawStrawberry(r, f);
            break;

        case "Orange":
            drawOrange(r, f);
            break;

        case "Apple":
            drawApple(r, f);
            break;

        case "Pear":
            drawPear(r, f);
            break;

        case "Peach":
            drawPeach(r, f);
            break;

        case "Watermelon":
            drawWatermelon(r, f);
            break;

        case "Melon":
            drawMelon(r, f);
            break;

        case "Pineapple":
            drawPineapple(r, f);
            break;

        case "Mango":
            drawMango(r, f);
            break;

        case "Kiwi":
            drawKiwi(r, f);
            break;

        case "Grapes":
            drawGrapes(r, f);
            break;

        case "Banana":
            drawBanana(r, f);
            break;

        case "Coconut":
            drawCoconut(r, f);
            break;

        case "Lemon":
            drawLemon(r, f);
            break;

        case "Blueberry":
            drawBlueberry(r, f);
            break;

        case "Avocado":
            drawAvocado(r, f);
            break;
 
        case "Papaya":
            drawPapaya(r, f);
            break;
            
        case "Golden Fruit":
            drawGoldenFruit(r, f);
            break;

        default:
            drawGenericFruit(
                r,
                f.type.color,
                f
            );
    }

    ctx.restore();
}

// ======================================================
// 🍉 PREMIUM 3D FRUIT GRADIENT
// ======================================================

function fruitGradient(
    light,
    base,
    dark,
    r
) {

    const g = ctx.createRadialGradient(
        -r * 0.42,
        -r * 0.48,
        r * 0.03,

        r * 0.20,
        r * 0.28,
        r * 1.18
    );

    // bright top-left
    g.addColorStop(
        0,
        "#ffffff"
    );

    g.addColorStop(
        0.08,
        light
    );

    // main fruit color
    g.addColorStop(
        0.30,
        base
    );

    g.addColorStop(
        0.62,
        base
    );

    // darker bottom/right
    g.addColorStop(
        0.84,
        dark
    );

    g.addColorStop(
        1,
        dark
    );

    return g;
}
// ======================================================
// 🍉 PREMIUM 3D FRUIT BODY
// ======================================================

function drawBody(
    r,
    light,
    base,
    dark,
    scaleX = 1,
    scaleY = 1
) {

    ctx.save();

    ctx.scale(
        scaleX,
        scaleY
    );

    // --------------------------------------------------
    // DROP SHADOW
    // --------------------------------------------------

    ctx.save();

    ctx.globalAlpha = 0.22;

    ctx.fillStyle = "#4b2b16";

    ctx.beginPath();

    ctx.ellipse(
        r * 0.08,
        r * 0.82,
        r * 0.72,
        r * 0.20,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();


    // --------------------------------------------------
    // MAIN 3D BODY
    // --------------------------------------------------

    const body =
        ctx.createRadialGradient(
            -r * 0.42,
            -r * 0.48,
            r * 0.03,

            r * 0.18,
            r * 0.22,
            r * 1.18
        );

    body.addColorStop(
        0,
        "#ffffff"
    );

    body.addColorStop(
        0.07,
        light
    );

    body.addColorStop(
        0.25,
        light
    );

    body.addColorStop(
        0.48,
        base
    );

    body.addColorStop(
        0.72,
        base
    );

    body.addColorStop(
        0.90,
        dark
    );

    body.addColorStop(
        1,
        dark
    );

    ctx.fillStyle =
        body;

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        r,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // --------------------------------------------------
    // DARK OUTER EDGE
    // --------------------------------------------------

    ctx.strokeStyle =
        "rgba(75,38,17,.35)";

    ctx.lineWidth =
        Math.max(
            1.5,
            r * 0.055
        );

    ctx.stroke();


    // --------------------------------------------------
    // SOFT INNER LIGHT
    // --------------------------------------------------

    const innerGlow =
        ctx.createRadialGradient(
            -r * 0.38,
            -r * 0.44,
            0,

            -r * 0.20,
            -r * 0.18,
            r * 0.72
        );

    innerGlow.addColorStop(
        0,
        "rgba(255,255,255,.72)"
    );

    innerGlow.addColorStop(
        0.20,
        "rgba(255,255,255,.28)"
    );

    innerGlow.addColorStop(
        0.60,
        "rgba(255,255,255,.06)"
    );

    innerGlow.addColorStop(
        1,
        "rgba(255,255,255,0)"
    );

    ctx.fillStyle =
        innerGlow;

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        r * 0.98,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // --------------------------------------------------
    // BIG GLASSY HIGHLIGHT
    // --------------------------------------------------

    ctx.fillStyle =
        "rgba(255,255,255,.52)";

    ctx.beginPath();

    ctx.ellipse(
        -r * 0.34,
        -r * 0.46,
        r * 0.22,
        r * 0.11,
        -0.55,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // --------------------------------------------------
    // SMALL SPECULAR HIGHLIGHT
    // --------------------------------------------------

    ctx.fillStyle =
        "rgba(255,255,255,.78)";

    ctx.beginPath();

    ctx.arc(
        -r * 0.48,
        -r * 0.58,
        r * 0.055,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // --------------------------------------------------
    // BOTTOM SOFT SHADING
    // --------------------------------------------------

    const bottomShade =
        ctx.createLinearGradient(
            0,
            r * 0.15,
            0,
            r
        );

    bottomShade.addColorStop(
        0,
        "rgba(0,0,0,0)"
    );

    bottomShade.addColorStop(
        0.70,
        "rgba(55,25,10,.05)"
    );

    bottomShade.addColorStop(
        1,
        "rgba(45,20,8,.18)"
    );

    ctx.fillStyle =
        bottomShade;

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        r * 0.99,
        0,
        Math.PI * 2
    );

    ctx.fill();


    ctx.restore();
}
// ======================================================
// ANIMATED FACE
// ======================================================

function drawFace(
    r,
    mode = "smile",
    blinking = false
) {
    const eyeR =
        Math.max(
            1.9,
            r * 0.105
        );

    const eyeY =
        r * 0.06;

    const eyeX =
        r * 0.28;

    // ==================================================
    // SLEEPY
    // ==================================================

    if (
        mode === "sleepy"
    ) {
        drawSleepyFace(
            r,
            eyeX,
            eyeY,
            eyeR
        );

        return;
    }

    // ==================================================
    // WOW
    // ==================================================

    if (
        mode === "wow"
    ) {
        drawWowFace(
            r,
            eyeX,
            eyeY,
            eyeR
        );

        return;
    }

    // ==================================================
    // HAPPY
    // ==================================================

    if (
        mode === "happy"
    ) {
        drawHappyFace(
            r,
            eyeX,
            eyeY,
            eyeR,
            blinking
        );

        return;
    }

    // ==================================================
    // NORMAL SMILE
    // ==================================================

    drawSmileFace(
        r,
        eyeX,
        eyeY,
        eyeR,
        blinking
    );
}

// ======================================================
// NORMAL SMILE FACE
// ======================================================

function drawSmileFace(
    r,
    eyeX,
    eyeY,
    eyeR,
    blinking
) {
    // Eyes

    ctx.strokeStyle =
        "#3a241b";

    ctx.fillStyle =
        "#3a241b";

    ctx.lineWidth =
        Math.max(
            1.7,
            r * 0.06
        );

    ctx.lineCap =
        "round";

    if (blinking) {
        ctx.beginPath();

        ctx.arc(
            -eyeX,
            eyeY,
            eyeR,
            0.15,
            Math.PI - 0.15
        );

        ctx.stroke();

        ctx.beginPath();

        ctx.arc(
            eyeX,
            eyeY,
            eyeR,
            0.15,
            Math.PI - 0.15
        );

        ctx.stroke();
    } else {
        ctx.beginPath();

        ctx.arc(
            -eyeX,
            eyeY,
            eyeR,
            0,
            Math.PI * 2
        );

        ctx.arc(
            eyeX,
            eyeY,
            eyeR,
            0,
            Math.PI * 2
        );

        ctx.fill();

        // Eye highlights

        ctx.fillStyle =
            "#ffffff";

        ctx.beginPath();

        ctx.arc(
            -eyeX -
                eyeR * 0.28,
            eyeY -
                eyeR * 0.35,
            eyeR * 0.30,
            0,
            Math.PI * 2
        );

        ctx.arc(
            eyeX -
                eyeR * 0.28,
            eyeY -
                eyeR * 0.35,
            eyeR * 0.30,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    drawCheeks(r);

    // Smile

    ctx.strokeStyle =
        "#3a241b";

    ctx.lineWidth =
        Math.max(
            1.5,
            r * 0.065
        );

    ctx.beginPath();

    ctx.arc(
        0,
        r * 0.12,
        r * 0.20,
        0.12,
        Math.PI - 0.12
    );

    ctx.stroke();
}

// ======================================================
// HAPPY FACE
// ======================================================

function drawHappyFace(
    r,
    eyeX,
    eyeY,
    eyeR,
    blinking
) {
    ctx.strokeStyle =
        "#3a241b";

    ctx.lineWidth =
        Math.max(
            1.8,
            r * 0.065
        );

    ctx.lineCap =
        "round";

    // Happy curved eyes

    ctx.beginPath();

    ctx.arc(
        -eyeX,
        eyeY + eyeR * 0.10,
        eyeR,
        Math.PI + 0.15,
        Math.PI * 2 - 0.15
    );

    ctx.stroke();

    ctx.beginPath();

    ctx.arc(
        eyeX,
        eyeY + eyeR * 0.10,
        eyeR,
        Math.PI + 0.15,
        Math.PI * 2 - 0.15
    );

    ctx.stroke();

    drawCheeks(r);

    // Bigger happy smile

    ctx.fillStyle =
        "#3a241b";

    ctx.beginPath();

    ctx.ellipse(
        0,
        r * 0.24,
        r * 0.20,
        r * 0.13,
        0,
        0,
        Math.PI * 2
    );

      ctx.fill();

    // Tiny tongue

    ctx.fillStyle =
        "#ff8290";

    ctx.beginPath();

    ctx.ellipse(
        0,
        r * 0.29,
        r * 0.09,
        r * 0.045,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();
}

// ======================================================
// WOW FACE
// ======================================================

function drawWowFace(
    r,
    eyeX,
    eyeY,
    eyeR
) {
    ctx.fillStyle =
        "#3a241b";

    // Big eyes

    ctx.beginPath();

    ctx.arc(
        -eyeX,
        eyeY,
        eyeR * 1.38,
        0,
        Math.PI * 2
    );

    ctx.arc(
        eyeX,
        eyeY,
        eyeR * 1.38,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // Big white highlights

    ctx.fillStyle =
        "#ffffff";

    ctx.beginPath();

    ctx.arc(
        -eyeX -
            eyeR * 0.35,
        eyeY -
            eyeR * 0.38,
        eyeR * 0.42,
        0,
        Math.PI * 2
    );

    ctx.arc(
        eyeX -
            eyeR * 0.35,
        eyeY -
            eyeR * 0.38,
        eyeR * 0.42,
        0,
        Math.PI * 2
    );

    ctx.fill();

    drawCheeks(r);

    // Open O mouth

    ctx.fillStyle =
        "#3a241b";

    ctx.beginPath();

    ctx.ellipse(
        0,
        r * 0.27,
        r * 0.13,
        r * 0.17,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // Tiny tongue

    ctx.fillStyle =
        "#ff7e88";

    ctx.beginPath();

    ctx.ellipse(
        0,
        r * 0.34,
        r * 0.065,
        r * 0.035,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();
}

// ======================================================
// SLEEPY FACE
// ======================================================

function drawSleepyFace(
    r,
    eyeX,
    eyeY,
    eyeR
) {
    ctx.strokeStyle =
        "#3a241b";

    ctx.lineWidth =
        Math.max(
            1.8,
            r * 0.065
        );

    ctx.lineCap =
        "round";

    // Closed sleepy eyes

    ctx.beginPath();

    ctx.arc(
        -eyeX,
        eyeY,
        eyeR * 1.15,
        0.15,
        Math.PI - 0.15
    );

    ctx.stroke();

    ctx.beginPath();

    ctx.arc(
        eyeX,
        eyeY,
        eyeR * 1.15,
        0.15,
        Math.PI - 0.15
    );

    ctx.stroke();

    drawCheeks(r);

    // Sleepy little smile

    ctx.beginPath();

    ctx.arc(
        0,
        r * 0.18,
        r * 0.16,
        0.15,
        Math.PI - 0.15
    );

    ctx.stroke();

    // ZZZ

    ctx.fillStyle =
        "rgba(80,65,120,.75)";

    ctx.font =
        `bold ${Math.max(
            8,
            r * 0.23
        )}px Arial`;

    ctx.textAlign =
        "center";

    ctx.fillText(
        "z",
        r * 0.55,
        -r * 0.45
    );

    ctx.font =
        `bold ${Math.max(
            6,
            r * 0.17
        )}px Arial`;

    ctx.fillText(
        "z",
        r * 0.75,
        -r * 0.72
    );
}

// ======================================================
// CHEEKS
// ======================================================

function drawCheeks(r) {
    ctx.globalAlpha =
        0.40;

    ctx.fillStyle =
        "#ff6f73";

    ctx.beginPath();

    ctx.ellipse(
        -r * 0.43,
        r * 0.28,
        r * 0.13,
        r * 0.07,
        0,
        0,
        Math.PI * 2
    );

    ctx.ellipse(
        r * 0.43,
        r * 0.28,
        r * 0.13,
        r * 0.07,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.globalAlpha =
        1;
}

// ======================================================
// LEAF
// ======================================================

function drawLeaf(
    x,
    y,
    size,
    angle
) {
    ctx.save();

    ctx.translate(
        x,
        y
    );

    ctx.rotate(
        angle
    );

    const g =
        ctx.createLinearGradient(
            0,
            0,
            size,
            -size * 0.25
        );

    g.addColorStop(
        0,
        "#2f7d32"
    );

    g.addColorStop(
        0.5,
        "#70b84b"
    );

    g.addColorStop(
        1,
        "#2d6a2d"
    );

    ctx.fillStyle =
        g;

    ctx.strokeStyle =
        "rgba(40,90,25,.45)";

    ctx.lineWidth =
        Math.max(
            1,
            size * 0.08
        );

    ctx.beginPath();

    ctx.moveTo(
        0,
        0
    );

    ctx.quadraticCurveTo(
        size * 0.65,
        -size * 0.55,
        size,
        0
    );

    ctx.quadraticCurveTo(
        size * 0.48,
        size * 0.35,
        0,
        0
    );

    ctx.fill();

    ctx.stroke();

    // Leaf vein

    ctx.strokeStyle =
        "rgba(255,255,255,.25)";

    ctx.lineWidth =
        1;

    ctx.beginPath();

    ctx.moveTo(
        0,
        0
    );

    ctx.lineTo(
        size * 0.72,
        -size * 0.10
    );

    ctx.stroke();

    ctx.restore();
}

// ======================================================
// STEM
// ======================================================

function drawStem(
    r,
    length = 0.28
) {
    ctx.strokeStyle =
        "#5c351b";

    ctx.lineWidth =
        Math.max(
            2,
            r * 0.09
        );

    ctx.lineCap =
        "round";

    ctx.beginPath();

    ctx.moveTo(
        0,
        -r * 0.76
    );

    ctx.quadraticCurveTo(
        r * 0.04,
        -r * 0.95,
        r * 0.11,
        -r * (
            0.76 +
            length
        )
    );

    ctx.stroke();
}

// ======================================================
// CHERRY
// ======================================================

function drawCherry(r, f) {
    ctx.strokeStyle =
        "#3f7225";

    ctx.lineWidth =
        Math.max(
            1.5,
            r * 0.07
        );

    ctx.lineCap =
        "round";

    ctx.beginPath();

    ctx.moveTo(
        -r * 0.20,
        -r * 0.45
    );

    ctx.quadraticCurveTo(
        -r * 0.28,
        -r * 0.90,
        0,
        -r * 1.05
    );

    ctx.moveTo(
        r * 0.22,
        -r * 0.43
    );

    ctx.quadraticCurveTo(
        r * 0.28,
        -r * 0.82,
        0,
        -r * 1.05
    );

    ctx.stroke();

    drawLeaf(
        r * 0.02,
        -r * 0.92,
        r * 0.42,
        -0.35
    );

    // Left cherry

    ctx.save();

    ctx.translate(
        -r * 0.34,
        r * 0.08
    );

    drawBody(
        r * 0.68,
        "#ff9aa6",
        "#e8324f",
        "#b91739"
    );

    drawFace(
        r * 0.68,
        f?.faceMode || "smile",
        f?.blinking
    );

    ctx.restore();

    // Right cherry

    ctx.save();

    ctx.translate(
        r * 0.34,
        r * 0.08
    );

    drawBody(
        r * 0.68,
        "#ff9aa6",
        "#e8324f",
        "#b91739"
    );

    drawFace(
        r * 0.68,
        f?.faceMode || "smile",
        f?.blinking
    );

    ctx.restore();
}

// ======================================================
// STRAWBERRY
// ======================================================

function drawStrawberry(r, f) {
    ctx.save();

    ctx.scale(
        0.92,
        1.05
    );

    ctx.beginPath();

    ctx.moveTo(
        0,
        r * 0.95
    );

    ctx.bezierCurveTo(
        -r * 0.95,
        r * 0.40,
        -r * 0.90,
        -r * 0.50,
        0,
        -r * 0.68
    );

    ctx.bezierCurveTo(
        r * 0.90,
        -r * 0.50,
        r * 0.95,
        r * 0.40,
        0,
        r * 0.95
    );

    ctx.closePath();

    ctx.fillStyle =
        fruitGradient(
            "#ff8d9e",
            "#f23556",
            "#b91435",
            r
        );

    ctx.fill();

    ctx.strokeStyle =
        "rgba(92,48,20,.30)";

    ctx.lineWidth =
        Math.max(
            1.5,
            r * 0.06
        );

    ctx.stroke();

    // ==================================================
    // 🍓 SEEDS
    // ==================================================

    ctx.fillStyle =
        "#ffd76b";

    for (
        let i = -2;
        i <= 2;
        i++
    ) {
        for (
            let j = -1;
            j <= 2;
            j++
        ) {
            const sx =
                i * r * 0.25 +
                (j % 2) *
                r * 0.10;

            const sy =
                j * r * 0.28 +
                r * 0.02;

            ctx.beginPath();

            ctx.ellipse(
                sx,
                sy,
                r * 0.035,
                r * 0.075,
                0,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }
    }

    // ==================================================
    // 🍃 LEAF
    // ==================================================

    drawLeaf(
        0,
        -r * 0.60,
        r * 0.55,
        -0.05
    );

    // ==================================================
    // 😊 FACE
    // ==================================================

    drawFace(
        r * 0.75,
        f?.faceMode || "smile",
        f?.blinking
    );

    ctx.restore();
}

// ======================================================
// ORANGE
// ======================================================

function drawOrange(r, f) {
    drawBody(
        r,
        "#ffd25b",
        "#ff9d18",
        "#e46b08"
    );

    ctx.globalAlpha =
        0.16;

    ctx.fillStyle =
        "#7b4300";

    for (
        let i = 0;
        i < 16;
        i++
    ) {
        const angle =
            Math.random() *
            Math.PI *
            2;

        const distance =
            Math.random() *
            r *
            0.70;

        ctx.beginPath();

        ctx.arc(
            Math.cos(angle) *
                distance,

            Math.sin(angle) *
                distance,

            Math.max(
                0.7,
                r * 0.018
            ),

            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.globalAlpha =
        1;

    drawLeaf(
        r * 0.20,
        -r * 0.83,
        r * 0.45,
        -0.35
    );

    drawStem(
        r,
        0.10
    );

    drawFace(
        r,
        f?.faceMode || "smile",
        f?.blinking
    );
}

// ======================================================
// APPLE
// ======================================================

function drawApple(r, f) {
    ctx.save();

    ctx.scale(
        1,
        0.94
    );

    ctx.beginPath();

    ctx.moveTo(
        0,
        -r * 0.72
    );

    ctx.bezierCurveTo(
        -r * 0.18,
        -r * 1.02,
        -r * 0.78,
        -r * 0.92,
        -r * 0.96,
        -r * 0.25
    );

    ctx.bezierCurveTo(
        -r * 1.08,
        r * 0.30,
        -r * 0.58,
        r * 0.92,
        0,
        r * 0.96
    );

    ctx.bezierCurveTo(
        r * 0.58,
        r * 0.92,
        r * 1.08,
        r * 0.30,
        r * 0.96,
        -r * 0.25
    );

    ctx.bezierCurveTo(
        r * 0.78,
        -r * 0.92,
        r * 0.18,
        -r * 1.02,
        0,
        -r * 0.72
    );

    ctx.closePath();

    ctx.fillStyle =
        fruitGradient(
            "#ff7c84",
            "#ef3047",
            "#b91632",
            r
        );

    ctx.fill();

    drawStem(
        r,
        0.12
    );

    drawLeaf(
        r * 0.22,
        -r * 0.82,
        r * 0.46,
        -0.35
    );

    drawFace(
        r * 0.90,
        f?.faceMode || "smile",
        f?.blinking
    );

    ctx.restore();
}

// ======================================================
// PEAR
// ======================================================

function drawPear(r, f) {
    ctx.save();

    ctx.beginPath();

    ctx.moveTo(
        0,
        -r * 1.00
    );

    ctx.bezierCurveTo(
        -r * 0.25,
        -r * 0.72,
        -r * 0.12,
        -r * 0.45,
        -r * 0.42,
        -r * 0.08
    );

    ctx.bezierCurveTo(
        -r * 0.95,
        r * 0.54,
        -r * 0.62,
        r * 1.02,
        0,
        r * 1.02
    );

    ctx.bezierCurveTo(
        r * 0.62,
        r * 1.02,
        r * 0.95,
        r * 0.54,
        r * 0.42,
        -r * 0.08
    );

    ctx.bezierCurveTo(
        r * 0.12,
        -r * 0.45,
        r * 0.25,
        -r * 0.72,
        0,
        -r * 1.00
    );

    ctx.closePath();

    ctx.fillStyle =
        fruitGradient(
            "#eaff9a",
            "#9ed43b",
            "#5f9e24",
            r
        );

    ctx.fill();

    drawStem(
        r,
        0.12
    );

    drawLeaf(
        r * 0.20,
        -r * 0.88,
        r * 0.42,
        -0.35
    );

    drawFace(
        r * 0.76,
        f?.faceMode || "smile",
        f?.blinking
    );

    ctx.restore();
}

// ======================================================
// PEACH
// ======================================================

function drawPeach(r, f) {
    drawBody(
        r,
        "#ffd1b5",
        "#ff996b",
        "#d95b3c",
        1,
        0.95
    );

    drawLeaf(
        r * 0.20,
        -r * 0.78,
        r * 0.44,
        -0.35
    );

    drawFace(
        r * 0.82,
        f?.faceMode || "smile",
        f?.blinking
    );
}

// ======================================================
// WATERMELON
// ======================================================

function drawWatermelon(r, f) {
    drawBody(
        r,
        "#b8ff9c",
        "#48bd45",
        "#167d39",
        1,
        0.98
    );

    ctx.globalAlpha =
        0.13;

    ctx.fillStyle =
        "#efffcf";

    ctx.beginPath();

    ctx.ellipse(
        0,
        r * 0.08,
        r * 0.62,
        r * 0.70,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.globalAlpha =
        1;

    drawFace(
        r * 0.78,
        f?.faceMode || "wow",
        f?.blinking
    );
}

// ======================================================
// MELON
// ======================================================

function drawMelon(r, f) {
    drawBody(
        r,
        "#f1ffb7",
        "#a7dc4a",
        "#5f9f2b",
        1,
        0.98
    );

    ctx.globalAlpha =
        0.16;

    ctx.fillStyle =
        "#faffdc";

    ctx.beginPath();

    ctx.ellipse(
        -r * 0.08,
        r * 0.05,
        r * 0.56,
        r * 0.64,
        -0.15,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.globalAlpha =
        1;

    drawLeaf(
        r * 0.18,
        -r * 0.82,
        r * 0.38,
        -0.35
    );

    drawFace(

            r * 0.78,
        f?.faceMode || "happy",
        f?.blinking
    );
}

// ======================================================
// PINEAPPLE
// ======================================================

function drawPineapple(r, f) {
    ctx.save();

    ctx.beginPath();

    ctx.ellipse(
        0,
        r * 0.08,
        r * 0.72,
        r * 0.90,
        0,
        0,
        Math.PI * 2
    );

    const body =
        ctx.createRadialGradient(
            -r * 0.34,
            -r * 0.48,
            r * 0.03,
            0,
            r * 0.15,
            r * 1.12
        );

    body.addColorStop(
        0,
        "#fff7bd"
    );

    body.addColorStop(
        0.24,
        "#f9d866"
    );

    body.addColorStop(
        0.68,
        "#f1b92d"
    );

    body.addColorStop(
        1,
        "#c98212"
    );

    ctx.fillStyle =
        body;

    ctx.fill();

    ctx.fillStyle =
        "rgba(255,245,166,.32)";

    for (
        let i = 0;
        i < 14;
        i++
    ) {
        const angle =
            i * 2.399;

        const distance =
            r *
            (
                0.18 +
                (i % 4) *
                0.13
            );

        ctx.beginPath();

        ctx.arc(
            Math.cos(angle) *
                distance,

            Math.sin(angle) *
                distance,

            r * 0.035,

            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    drawLeaf(
        -r * 0.35,
        -r * 0.72,
        r * 0.55,
        -1.05
    );

    drawLeaf(
        0,
        -r * 0.86,
        r * 0.60,
        -1.55
    );

    drawLeaf(
        r * 0.32,
        -r * 0.72,
        r * 0.55,
        -2.10
    );

    drawFace(
        r * 0.72,
        f?.faceMode || "happy",
        f?.blinking
    );

    ctx.restore();
}

// ======================================================
// MANGO
// ======================================================

function drawMango(r, f) {
    drawBody(
        r,
        "#ffe18a",
        "#ff9f1c",
        "#dc6411",
        0.86,
        1.12
    );

    drawLeaf(
        -r * 0.12,
        -r * 0.92,
        r * 0.45,
        -0.35
    );

    drawFace(
        r * 0.82,
        f?.faceMode || "smile",
        f?.blinking
    );
}

// ======================================================
// KIWI
// ======================================================

function drawKiwi(r, f) {
    drawBody(
        r,
        "#d7ff8a",
        "#83b735",
        "#527d20"
    );

    // Inner kiwi flesh

    ctx.fillStyle =
        "#a9d94c";

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        r * 0.68,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // Center

    ctx.fillStyle =
        "#f8f0c4";

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        r * 0.18,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // Seeds

    ctx.fillStyle =
        "#352719";

    for (
        let i = 0;
        i < 18;
        i++
    ) {
        const angle =
            i * 0.82;

        const distance =
            r * 0.40;

        ctx.beginPath();

        ctx.ellipse(
            Math.cos(angle) *
                distance,

            Math.sin(angle) *
                distance,

            r * 0.025,
            r * 0.055,
            angle,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    drawFace(
        r * 0.75,
        f?.faceMode || "happy",
        f?.blinking
    );
}

// ======================================================
// GRAPES
// ======================================================

function drawGrapes(r, f) {
    const grapeR =
        r * 0.27;

    const positions = [
        [0, -0.55],

        [-0.30, -0.34],
        [0.30, -0.34],

        [-0.45, -0.05],
        [0, -0.05],
        [0.45, -0.05],

        [-0.30, 0.24],
        [0.30, 0.24],

        [0, 0.50]
    ];

    for (
        const [px, py]
        of positions
    ) {
        ctx.save();

        ctx.translate(
            px * r,
            py * r
        );

        drawBody(
            grapeR,
            "#b77af2",
            "#7b2cbf",
            "#4b147d"
        );

        ctx.restore();
    }

    drawLeaf(
        -r * 0.20,
        -r * 0.76,
        r * 0.52,
        -0.30
    );

    drawFace(
        r * 0.55,
        f?.faceMode || "happy",
        f?.blinking
    );
}

// ======================================================
// BANANA
// ======================================================

function drawBanana(r, f) {
    ctx.save();

    ctx.rotate(
        -0.18
    );

    ctx.strokeStyle =
        "#c58b00";

    ctx.lineCap =
        "round";

    ctx.lineWidth =
        r * 0.38;

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        r * 0.70,
        -0.85,
        0.85
    );

    ctx.strokeStyle =
        "#c58b00";

    ctx.stroke();

    ctx.lineWidth =
        r * 0.30;

    ctx.strokeStyle =
        "#ffd83d";

    ctx.stroke();

    // Highlight

    ctx.globalAlpha =
        0.35;

    ctx.lineWidth =
        r * 0.09;

    ctx.strokeStyle =
        "#ffffff";

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        r * 0.70,
        -0.68,
        0.35
    );

    ctx.stroke();

    ctx.globalAlpha =
        1;

    drawFace(
        r * 0.50,
        f?.faceMode || "happy",
        f?.blinking
    );

    ctx.restore();
}

// ======================================================
// COCONUT
// ======================================================

function drawCoconut(r, f) {
    drawBody(
        r,
        "#a97846",
        "#75452b",
        "#3e2518"
    );

    // Soft shell speckles

    ctx.fillStyle =
        "rgba(255,220,170,.16)";

    for (
        let i = 0;
        i < 14;
        i++
    ) {
        const angle =
            i * 2.399;

        const distance =
            r *
            (
                0.18 +
                (i % 5) *
                0.13
            );

        ctx.beginPath();

        ctx.arc(
            Math.cos(angle) *
                distance,

            Math.sin(angle) *
                distance,

            r * 0.025,

            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    // Three coconut eyes

    ctx.fillStyle =
        "#29170f";

    ctx.beginPath();

    ctx.arc(
        -r * 0.18,
        -r * 0.22,
        r * 0.07,
        0,
        Math.PI * 2
    );

    ctx.arc(
        r * 0.18,
        -r * 0.22,
        r * 0.07,
        0,
        Math.PI * 2
    );

    ctx.arc(
        0,
        r * 0.04,
        r * 0.07,
        0,
        Math.PI * 2
    );

    ctx.fill();

    drawFace(
        r * 0.65,
        f?.faceMode || "smile",
        f?.blinking
    );
}

// ======================================================
// LEMON
// ======================================================

function drawLemon(r, f) {
    drawBody(
        r,
        "#fff39a",
        "#ffd60a",
        "#dcae00",
        1.25,
        0.72
    );

    drawLeaf(
        -r * 0.22,
        -r * 0.62,
        r * 0.42,
        -0.35
    );

    drawFace(
        r * 0.72,
        f?.faceMode || "happy",
        f?.blinking
    );
}

// ======================================================
// BLUEBERRY
// ======================================================

function drawBlueberry(r, f) {
    drawBody(
        r,
        "#8da9ff",
        "#4361ee",
        "#202c96"
    );

    // Crown

    ctx.fillStyle =
        "#29358f";

    ctx.beginPath();

    for (
        let i = 0;
        i < 6;
        i++
    ) {
        const angle =
            -Math.PI / 2 +
            i *
            (
                Math.PI * 2 /
                6
            );

        const px =
            Math.cos(angle) *
            r * 0.30;

        const py =
            Math.sin(angle) *
            r * 0.30;

        if (i === 0) {
            ctx.moveTo(
                px,
                py
            );
        } else {
            ctx.lineTo(
                px,
                py
            );
        }
    }

    ctx.closePath();

    ctx.fill();

    drawFace(
        r * 0.75,
        f?.faceMode || "happy",
        f?.blinking
    );
}

// ======================================================
// AVOCADO
// ======================================================

function drawAvocado(r, f) {
    ctx.save();

    ctx.scale(
        0.80,
        1.12
    );

    ctx.beginPath();

    ctx.moveTo(
        0,
        -r
    );

    ctx.bezierCurveTo(
        -r * 0.75,
        -r * 0.75,
        -r * 0.95,
        r * 0.15,
        0,
        r
    );

    ctx.bezierCurveTo(
        r * 0.95,
        r * 0.15,
        r * 0.75,
        -r * 0.75,
        0,
        -r
    );

    ctx.closePath();

    ctx.fillStyle =
        fruitGradient(
            "#c8f08a",
            "#6a994e",
            "#315c2c",
            r
        );

    ctx.fill();

    // Pit

    const pit =
        ctx.createRadialGradient(
            -r * 0.08,
            -r * 0.10,
            r * 0.02,

            0,
            0,
            r * 0.40
        );

    pit.addColorStop(
        0,
        "#d59b54"
    );

    pit.addColorStop(
        1,
        "#71421f"
    );

    ctx.fillStyle =
        pit;

    ctx.beginPath();

    ctx.arc(
        0,
        r * 0.30,
        r * 0.28,
        0,
        Math.PI * 2
    );

    ctx.fill();

    drawFace(
        r * 0.72,
        f?.faceMode || "happy",
        f?.blinking
    );

    ctx.restore();
}

// ======================================================
// DRAGON FRUIT
// ======================================================

function drawDragonFruit(r, f) {
    drawBody(
        r,
        "#ffb0d4",
        "#ef4b91",
        "#b52668",
        0.95,
        1.05
    );

    // White flesh

    ctx.fillStyle =
        "#fffaf2";

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        r * 0.68,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // Seeds

    ctx.fillStyle =
        "#3b2630";

    for (
        let i = 0;
        i < 28;
        i++
    ) {
        const angle =
            Math.random() *
            Math.PI *
            2;

        const distance =
            Math.random() *
            r *
            0.52;

        ctx.beginPath();

        ctx.ellipse(
            Math.cos(angle) *
                distance,

            Math.sin(angle) *
                distance,

            r * 0.018,
            r * 0.035,
            angle,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    // Soft outer dots

    ctx.fillStyle =
        "rgba(255,255,255,.18)";

    for (
        let i = 0;
        i < 10;
        i++
    ) {
        const angle =
            i * 0.63;

        const distance =
            r * 0.80;

        ctx.beginPath();

        ctx.arc(
            Math.cos(angle) *
                distance,

            Math.sin(angle) *
                distance,

            r * 0.035,

            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    drawFace(
        r * 0.72,
        f?.faceMode || "happy",
        f?.blinking
    );
}

// ======================================================
// PAPAYA
// ======================================================

function drawPapaya(r, f) {
    drawBody(
        r,
        "#ffe89b",
        "#ff8c24",
        "#d95016",
        0.86,
        1.12
    );

    // Papaya inner

    ctx.fillStyle =
        "#ffb52e";

    ctx.beginPath();

    ctx.ellipse(
        0,
        0,
        r * 0.40,
        r * 0.70,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // Seeds

    ctx.fillStyle =
        "#402417";

    for (
        let i = 0;
        i < 12;
        i++
    ) {
        const angle =
            i * 0.52;

        ctx.beginPath();

        ctx.arc(
            Math.cos(angle) *
                r * 0.18,

            Math.sin(angle) *
                r * 0.34,

            r * 0.035,

            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    drawFace(
        r * 0.68,
        f?.faceMode || "happy",
        f?.blinking
    );
}

// ======================================================
// GOLDEN FRUIT
// ======================================================

function drawGoldenFruit(r, f) {
    const g =
        ctx.createRadialGradient(
            -r * 0.35,
            -r * 0.40,
            r * 0.03,

            0,
            0,
            r * 1.20
        );

    g.addColorStop(
        0,
        "#ffffff"
    );

    g.addColorStop(
        0.18,
        "#fff7a8"
    );

    g.addColorStop(
        0.45,
        "#ffd84d"
    );

    g.addColorStop(
        0.80,
        "#f2a900"
    );

    g.addColorStop(
        1,
        "#b66a00"
    );

    ctx.fillStyle =
        g;

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        r,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // Stars

    for (
        let i = 0;
        i < 5;
        i++
    ) {
        const angle =
            i *
            Math.PI *
            2 /
            5;

        const sx =
            Math.cos(angle) *
            r * 0.72;

        const sy =
            Math.sin(angle) *
            r * 0.72;

        drawStar(
            sx,
            sy,
            r * 0.07
        );
    }

    drawFace(
        r * 0.75,
        "wow",
        f?.blinking
    );
}

// ======================================================
// STAR
// ======================================================

function drawStar(
    x,
    y,
    size
) {
    ctx.save();

    ctx.translate(
        x,
        y
    );

    ctx.fillStyle =
        "#ffffff";

    ctx.beginPath();

    for (
        let i = 0;
        i < 8;
        i++
    ) {
        const angle =
            i *
            Math.PI /
            4;

        const radius =
            i % 2 === 0
                ? size
                : size * 0.35;

        const px =
            Math.cos(angle) *
            radius;

        const py =
            Math.sin(angle) *
            radius;

        if (i === 0) {
            ctx.moveTo(
                px,
                py
            );
        } else {
            ctx.lineTo(
                px,
                py
            );
        }
    }

    ctx.closePath();

    ctx.fill();

    ctx.restore();
}

// ======================================================
// GENERIC FRUIT
// ======================================================

function drawGenericFruit(
    r,
    color,
    f
) {
    drawBody(
        r,
        "#ffffff",
        color,
        "#553525"
    );

    drawFace(
        r,
        f?.faceMode || "smile",
        f?.blinking
    );
}

// ======================================================
// DRAW
// ======================================================

function draw() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    // ==================================================
    // PLAIN CREAM GAME BACKGROUND
    // ==================================================

    ctx.fillStyle =
        "#FFF4D8";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    // ==================================================
    // SOFT GLOW
    // ==================================================

    const glow =
        ctx.createRadialGradient(
            canvas.width * 0.50,
            canvas.height * 0.40,
            10,

            canvas.width * 0.50,
            canvas.height * 0.40,
            canvas.width * 0.75
        );

    glow.addColorStop(
    0,
    "rgba(255,255,255,0)"
);

    glow.addColorStop(
        1,
        "rgba(255,255,255,0)"
    );

    ctx.fillStyle =
        glow;

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    // ==================================================
    // DROP GUIDE
    // ==================================================

    ctx.save();

    ctx.strokeStyle =
        "rgba(229,72,72,0.35)";

    ctx.lineWidth =
        2;

    ctx.setLineDash([
        6,
        6
    ]);

    ctx.beginPath();

    ctx.moveTo(
        dropX,
        0
    );

    ctx.lineTo(
        dropX,
        canvas.height
    );

    ctx.stroke();

    ctx.restore();

    // ==================================================
    // DANGER LINE
    // ==================================================

    ctx.save();

    ctx.strokeStyle =
        "rgba(238,91,91,0.65)";

    ctx.lineWidth =
        2;

    ctx.setLineDash([
        8,
        6
    ]);

    ctx.beginPath();

    ctx.moveTo(
        0,
        DANGER_Y
    );

    ctx.lineTo(
        canvas.width,
        DANGER_Y
    );

    ctx.stroke();

    ctx.setLineDash([]);

    ctx.restore();

    // ==================================================
    // CURRENT FRUIT
    // ==================================================

    if (
        canDrop &&
        !paused &&
        !over
    ) {

        const r =
            getFruitRadius(
                currentFruit
            );

        dropX =
            Math.max(
                r,
                Math.min(
                    canvas.width - r,
                    dropX
                )
            );

        // Small drop guide

        ctx.save();

        ctx.setLineDash([
            5,
            5
        ]);

        ctx.strokeStyle =
            "rgba(232,62,140,.32)";

        ctx.beginPath();

        ctx.moveTo(
            dropX,
            0
        );

        ctx.lineTo(
            dropX,
            55
        );

        ctx.stroke();

        ctx.restore();

        // Preview fruit

        drawFruit({
            x:
                dropX,

            y:
                40,

            type:
                currentFruit,

            angle:
                0,

            faceMode:
                "happy",

            blinking:
                false,

            expressionPulse:
                0
        });
    }

    // ==================================================
    // BOARD
    // ==================================================

    for (
        const f of board
    ) {
        drawFruit(f);
    }

    // ==================================================
    // MERGE EFFECTS
    // ==================================================

    drawMergeEffects();

    // ==================================================
    // PARTICLES
    // ==================================================

    for (
        const p of particles
    ) {

        ctx.globalAlpha =
            Math.max(
                0,
                p.life
            );

        ctx.fillStyle =
            p.color;

        ctx.beginPath();

        ctx.arc(
            p.x,
            p.y,
            p.size,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.globalAlpha =
        1;

    // ==================================================
    // OVERLAYS
    // ==================================================

    if (over) {

        overlay(
            "GAME OVER"
        );
    }
}


// ======================================================
// OVERLAY
// ======================================================

function overlay(text) {

    ctx.fillStyle =
        "#0008";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.fillStyle =
        "#fff";

    ctx.font =
        "bold 34px Arial";

    ctx.textAlign =
        "center";

    ctx.textBaseline =
        "middle";

    ctx.fillText(
        text,
        canvas.width / 2,
        canvas.height / 2
    );

    ctx.textBaseline =
        "alphabetic";
}


// ======================================================
// GAME OVER CHECK
// ======================================================

function checkGameOver() {

    if (over) {
        return;
    }

    for (
        const f of board
    ) {

        const r =
            getFruitRadius(
                f.type
            );

        const top =
            f.y - r;

        // Newly dropped fruits get
        // a short grace period.

        if (
            (f.age || 0) <
            0.8
        ) {
            continue;
        }

        // ==================================================
        // DANGER ZONE
        // ==================================================

        if (
            top <=
            DANGER_Y
        ) {

            if (
                typeof f.dangerTimer !==
                "number"
            ) {
                f.dangerTimer = 0;
            }

            f.dangerTimer +=
                FIXED_DT;

            if (
                f.dangerTimer >=
                0.7
            ) {

                over = true;

                endGame();

                return;
            }

        } else {

            f.dangerTimer = 0;
        }
    }
}


// ======================================================
// GAME LOOP
// ======================================================

function loop(time) {

    if (
        paused ||
        over
    ) {

        draw();

        if (!over) {

            raf =
                requestAnimationFrame(
                    loop
                );
        }

        return;
    }

    let delta =
        (time - lastTime) /
        1000;

    lastTime =
        time;

    delta =
        Math.min(
            delta,
            0.05
        );

    accumulator +=
        delta;

    while (
        accumulator >=
        FIXED_DT
    ) {

        update(
            FIXED_DT
        );

        accumulator -=
            FIXED_DT;

        if (over) {
            break;
        }
    }

    draw();

    if (!over) {

        raf =
            requestAnimationFrame(
                loop
            );
    }
}


// ======================================================
// END GAME
// ======================================================

function endGame() {

    // Prevent duplicate processing

    if (
        gameOverSoundPlayed
    ) {
        return;
    }

    // ==================================================
    // MARK SOUND AS PLAYED FIRST
    // ==================================================

    gameOverSoundPlayed =
        true;

    // ==================================================
    // GAME OVER SOUND
    // ==================================================

    playSound(
        "gameover"
    );

    // ==================================================
    // STOP GAME LOOP
    // ==================================================

    cancelAnimationFrame(
        raf
    );

   // ==================================================
// ADD EARNED COINS
// ==================================================

data.coins =
    (data.coins || 0) +
    coins;


// ==================================================
// ADD TO LIFETIME COINS EARNED
// ==================================================

data.totalCoinsEarned =
    (data.totalCoinsEarned || 0) +
    coins;


// ==================================================
// SAVE SESSION SCORE
// ==================================================

data.sessionScore =
    score;

    // ==================================================
    // LEVEL
    // ==================================================

    if (
        typeof data.level !==
        "number"
    ) {
        data.level = 1;
    }

    // ==================================================
    // HIGH SCORE
    // ==================================================

    const oldBest =
        data.highScore || 0;

    const newBest =
        score > oldBest;

    if (newBest) {

        data.highScore =
            score;
    }

    // ==================================================
    // UPDATE UI
    // ==================================================

    updateUI();

    // ==================================================
    // SEND RESULT TO MAIN.JS
    // ==================================================

    if (
        typeof finishCallback ===
        "function"
    ) {

        finishCallback({
            score,
            coins,
            newBest
        });
    }
}