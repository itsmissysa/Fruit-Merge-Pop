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
const BOUNCE = 0.18;
const FRICTION = 0.82;
const AIR_FRICTION = 0.995;

const FIXED_DT = 1 / 60;

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

export function initGame(refs, saveData, done) {
    canvas = refs.canvas;

    ctx = canvas.getContext("2d");

    ctx.imageSmoothingEnabled = true;

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
    // Keeps a separate record of whether the actual
    // Golden Fruit has been created.
    //
    // This is intentionally NOT based on bestFruit.
    // ==================================================

    if (
        typeof data.goldenFruitCreated !== "boolean"
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
    canvas.onmousemove = e => {
        setDrop(e.clientX);
    };

    canvas.onclick = () => {
        drop();
    };

    canvas.ontouchmove = e => {
        e.preventDefault();

        setDrop(
            e.touches[0].clientX
        );
    };

    canvas.ontouchstart = e => {
        e.preventDefault();

        setDrop(
            e.touches[0].clientX
        );

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

            paused = !paused;

            playSound("pause");

            pauseBtn.textContent =
                paused ? "▶" : "⏸";

            if (!paused) {
                lastTime =
                    performance.now();

                accumulator = 0;
            }
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
        restartButton.onclick =
            startGame;
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

    paused = false;
    over = false;
    canDrop = true;

    // Allows game-over sound to play again
    // after restarting.
    gameOverSoundPlayed = false;

    accumulator = 0;

    currentFruit =
        randomSmallFruit();

    nextFruit =
        randomSmallFruit();

    dropX =
        canvas.width / 2;

    if (pauseBtn) {
        pauseBtn.textContent =
            "⏸";
    }

    updateUI();

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

    board.push({
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
    });

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
// UI
// ======================================================

function updateUI() {
    if (scoreEl) {
        scoreEl.textContent =
            score;
    }

    if (coinsEl) {
        coinsEl.textContent =
            (data.coins || 0) + coins;
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

    checkGameOver();
}

// ======================================================
// PHYSICS
// ======================================================

function updatePhysics(dt) {
    for (const f of board) {
        f.age =
            (f.age || 0) + dt;

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
            f.angularVelocity * dt;

        f.angularVelocity =
            Math.max(
                -1.2,
                Math.min(
                    1.2,
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
                Math.abs(f.vx) > 20
            ) {
                f.vx =
                    Math.abs(f.vx) *
                    BOUNCE;
            } else {
                f.vx = 0;
            }

            f.angularVelocity *=
                0.8;
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
                Math.abs(f.vx) > 20
            ) {
                f.vx =
                    -Math.abs(f.vx) *
                    BOUNCE;
            } else {
                f.vx = 0;
            }

            f.angularVelocity *=
                0.8;
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

            f.angularVelocity +=
                f.vx * 0.006;

            f.vx *=
                FRICTION;

            f.angularVelocity *=
                0.96;
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
                    f.x - other.x;

                const dy =
                    f.y - other.y;

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
                        other.y > f.y
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
                f.sleepTimer > 0.30
            ) {
                f.vx = 0;
                f.vy = 0;
                f.angularVelocity = 0;
                f.sleeping = true;
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
                wakeFruit(a);
                wakeFruit(b);
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
                relativeVelocityX * tx +
                relativeVelocityY * ty;

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

            wakeFruit(a);
            wakeFruit(b);

            keepInside(a);
            keepInside(b);
        }
    }

    return false;
}

// ======================================================
// WAKE FRUIT
// ======================================================

function wakeFruit(f) {
    f.sleeping = false;
    f.sleepTimer = 0;
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

    board.push({
        x,

        y:
            y - 3,

        vx:
            vx * 0.5,

        vy:
            Math.min(
                vy,
                -150
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
            ) * 0.15,

        sleeping: false,

        sleepTimer: 0
    });

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

    // ==================================================
    // BEST FRUIT
    // ==================================================
    // This tracks the highest fruit LEVEL reached.
    // It is NOT used anymore to determine whether
    // the Golden Fruit was actually created.
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
    // IMPORTANT:
    //
    // Only mark the Golden Fruit mission as completed
    // when the actual Golden Fruit object is created.
    //
    // Reaching level 8, 10, 15, etc. does NOT count.
    // ==================================================

    if (
        newType.name ===
        "Golden Fruit"
    ) {
        data.goldenFruitCreated = true;
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

    // ==================================================
    // SOFT SHADOW
    // ==================================================

    ctx.save();

    ctx.globalAlpha =
        0.16;

    ctx.fillStyle =
        "#43291c";

    ctx.beginPath();

    ctx.ellipse(
        3,
        r * 0.72,
        r * 0.78,
        r * 0.20,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();

    // ==================================================
    // FRUIT STYLE
    // ==================================================

    switch (
        f.type.name
    ) {
        case "Cherry":
            drawCherry(r);
            break;

        case "Strawberry":
            drawStrawberry(r);
            break;

        case "Orange":
            drawOrange(r);
            break;

        case "Apple":
            drawApple(r);
            break;

        case "Pear":
            drawPear(r);
            break;

        case "Peach":
            drawPeach(r);
            break;

        case "Watermelon":
            drawWatermelon(r);
            break;

        case "Melon":
            drawMelon(r);
            break;

        case "Pineapple":
            drawPineapple(r);
            break;

        case "Mango":
            drawMango(r);
            break;

        case "Kiwi":
            drawKiwi(r);
            break;

        case "Grapes":
            drawGrapes(r);
            break;

        case "Banana":
            drawBanana(r);
            break;

        case "Coconut":
            drawCoconut(r);
            break;

        case "Lemon":
            drawLemon(r);
            break;

        case "Blueberry":
            drawBlueberry(r);
            break;

        case "Avocado":
            drawAvocado(r);
            break;

        case "Dragon Fruit":
            drawDragonFruit(r);
            break;

        case "Papaya":
            drawPapaya(r);
            break;

        case "Golden Fruit":
            drawGoldenFruit(r);
            break;

        default:
            drawGenericFruit(
                r,
                f.type.color
            );
    }

    ctx.restore();
}

// ======================================================
// GRADIENT
// ======================================================

function fruitGradient(
    light,
    base,
    dark,
    r
) {
    const g =
        ctx.createRadialGradient(
            -r * 0.38,
            -r * 0.44,
            r * 0.03,

            0,
            0,
            r * 1.15
        );

    g.addColorStop(
        0,
        light
    );

    g.addColorStop(
        0.25,
        base
    );

    g.addColorStop(
        0.75,
        base
    );

    g.addColorStop(
        1,
        dark
    );

    return g;
}

// ======================================================
// GENERIC 3D BODY
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

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        r,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        fruitGradient(
            light,
            base,
            dark,
            r
        );

    ctx.fill();

    ctx.lineWidth =
        Math.max(
            1.8,
            r * 0.055
        );

    ctx.strokeStyle =
        "rgba(75,42,25,.28)";

    ctx.stroke();

    // ==================================================
    // GLOSS
    // ==================================================

    ctx.globalAlpha =
        0.38;

    ctx.fillStyle =
        "#ffffff";

    ctx.beginPath();

    ctx.ellipse(
        -r * 0.34,
        -r * 0.43,
        r * 0.22,
        r * 0.11,
        -0.55,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.globalAlpha =
        0.12;

    ctx.beginPath();

    ctx.arc(
        -r * 0.18,
        -r * 0.20,
        r * 0.48,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.globalAlpha =
        1;

    ctx.restore();
}

// ======================================================
// FACE
// ======================================================

function drawFace(
    r,
    mouth = "smile"
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
    // EYES
    // ==================================================

    ctx.fillStyle =
        "#3a241b";

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

    // ==================================================
    // EYE HIGHLIGHTS
    // ==================================================

    ctx.fillStyle =
        "#ffffff";

    ctx.beginPath();

    ctx.arc(
        -eyeX - eyeR * 0.28,
        eyeY - eyeR * 0.35,
        eyeR * 0.30,
        0,
        Math.PI * 2
    );

    ctx.arc(
        eyeX - eyeR * 0.28,
        eyeY - eyeR * 0.35,
        eyeR * 0.30,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // ==================================================
    // CHEEKS
    // ==================================================

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

    // ==================================================
    // MOUTH
    // ==================================================

    ctx.strokeStyle =
        "#3a241b";

    ctx.lineWidth =
        Math.max(
            1.5,
            r * 0.065
        );

    ctx.lineCap =
        "round";

    if (
        mouth === "open"
    ) {
        ctx.fillStyle =
            "#3a241b";

        ctx.beginPath();

        ctx.ellipse(
            0,
            r * 0.24,
            r * 0.12,
            r * 0.15,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();
    } else {
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

function drawCherry(r) {
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
        "smile"
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
        "smile"
    );

    ctx.restore();
}

// ======================================================
// STRAWBERRY
// ======================================================

function drawStrawberry(r) {
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

    // Seeds

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

    drawLeaf(
        0,
        -r * 0.60,
        r * 0.55,
        -0.05
    );

    drawFace(
        r * 0.75,
        "smile"
    );

    ctx.restore();
}

// ======================================================
// ORANGE
// ======================================================

function drawOrange(r) {
    drawBody(
        r,
        "#ffd25b",
        "#ff9d18",
        "#e46b08"
    );

    // Orange texture

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
        "smile"
    );
}

// ======================================================
// APPLE
// ======================================================

function drawApple(r) {
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

    ctx.strokeStyle =
        "rgba(92,48,20,.30)";

    ctx.lineWidth =
        Math.max(
            1.8,
            r * 0.06
        );

    ctx.stroke();

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
        "smile"
    );

    ctx.restore();
}

// ======================================================
// PEAR
// ======================================================

function drawPear(r) {
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

    ctx.strokeStyle =
        "rgba(92,48,20,.30)";

    ctx.lineWidth =
        Math.max(
            1.8,
            r * 0.06
        );

    ctx.stroke();

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
        "smile"
    );

    ctx.restore();
}

// ======================================================
// PEACH
// ======================================================

function drawPeach(r) {
    drawBody(
        r,
        "#ffd1b5",
        "#ff996b",
        "#d95b3c",
        1,
        0.95
    );

    // Peach center line

    ctx.strokeStyle =
        "rgba(130,65,45,.25)";

    ctx.lineWidth =
        Math.max(
            1.5,
            r * 0.035
        );

    ctx.beginPath();

    ctx.moveTo(
        0,
        -r * 0.75
    );

    ctx.quadraticCurveTo(
        -r * 0.12,
        0,
        0,
        r * 0.75
    );

    ctx.stroke();

    drawLeaf(
        r * 0.20,
        -r * 0.78,
        r * 0.44,
        -0.35
    );

    drawFace(
        r * 0.82,
        "smile"
    );
}

// ======================================================
// WATERMELON
// ======================================================

function drawWatermelon(r) {
    drawBody(
        r,
        "#a5f579",
        "#42b83f",
        "#128737"
    );

    ctx.strokeStyle =
        "#126b35";

    ctx.lineWidth =
        Math.max(
            2,
            r * 0.075
        );

    ctx.globalAlpha =
        0.68;

    for (
        let i = -2;
        i <= 2;
        i++
    ) {
        ctx.beginPath();

        ctx.moveTo(
            i * r * 0.30,
            -r * 0.82
        );

        ctx.quadraticCurveTo(
            i * r * 0.40,
            0,
            i * r * 0.30,
            r * 0.82
        );

        ctx.stroke();
    }

    ctx.globalAlpha =
        1;

    drawFace(
        r * 0.78,
        "open"
    );
}

// ======================================================
// MELON
// ======================================================

function drawMelon(r) {
    drawBody(
        r,
        "#e6ffa4",
        "#9edb43",
        "#65a92c"
    );

    ctx.strokeStyle =
        "rgba(64,112,42,.30)";

    ctx.lineWidth =
        Math.max(
            1,
            r * 0.035
        );

    for (
        let i = -3;
        i <= 3;
        i++
    ) {
        ctx.beginPath();

        ctx.moveTo(
            -r,
            i * r * 0.30
        );

        ctx.quadraticCurveTo(
            0,
            i * r * 0.20,
            r,
            i * r * 0.30
        );

        ctx.stroke();
    }

    for (
        let i = -3;
        i <= 3;
        i++
    ) {
        ctx.beginPath();

        ctx.moveTo(
            i * r * 0.30,
            -r
        );

        ctx.quadraticCurveTo(
            i * r * 0.20,
            0,
            i * r * 0.30,
            r
        );

        ctx.stroke();
    }

    drawLeaf(
        r * 0.18,
        -r * 0.82,
        r * 0.38,
        -0.35
    );

    drawFace(
        r * 0.78,
        "open"
    );
}

// ======================================================
// PINEAPPLE
// ======================================================

function drawPineapple(r) {
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

    ctx.fillStyle =
        fruitGradient(
            "#fff39a",
            "#f4c542",
            "#d99718",
            r
        );

    ctx.fill();

    ctx.strokeStyle =
        "rgba(92,48,20,.30)";

    ctx.lineWidth =
        Math.max(
            1.8,
            r * 0.055
        );

    ctx.stroke();

    // Pineapple diamond pattern

    ctx.strokeStyle =
        "rgba(160,100,20,.40)";

    ctx.lineWidth =
        Math.max(
            1,
            r * 0.025
        );

    for (
        let i = -4;
        i <= 4;
        i++
    ) {
        ctx.beginPath();

        ctx.moveTo(
            -r * 0.70,
            i * r * 0.22
        );

        ctx.lineTo(
            r * 0.70,
            i * r * 0.22
        );

        ctx.stroke();
    }

    for (
        let i = -4;
        i <= 4;
        i++
    ) {
        ctx.beginPath();

        ctx.moveTo(
            i * r * 0.20,
            -r * 0.78
        );

        ctx.lineTo(
            i * r * 0.20,
            r * 0.82
        );

        ctx.stroke();
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
        "smile"
    );

    ctx.restore();
}

// ======================================================
// MANGO
// ======================================================

function drawMango(r) {
    drawBody(
        r,
        "#ffe18a",
        "#ff9f1c",
        "#dc6411",
        0.86,
        1.12
    );

    ctx.strokeStyle =
        "rgba(165,75,20,.25)";

    ctx.lineWidth =
        Math.max(
            1,
            r * 0.025
        );

    ctx.beginPath();

    ctx.moveTo(
        r * 0.25,
        -r * 0.75
    );

    ctx.quadraticCurveTo(
        r * 0.48,
        0,
        r * 0.12,
        r * 0.72
    );

    ctx.stroke();

    drawLeaf(
        -r * 0.12,
        -r * 0.92,
        r * 0.45,
        -0.35
    );

    drawFace(
        r * 0.82,
        "smile"
    );
}

// ======================================================
// KIWI
// ======================================================

function drawKiwi(r) {
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
        "smile"
    );
}

// ======================================================
// GRAPES
// ======================================================

function drawGrapes(r) {
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
        "smile"
    );
}

// ======================================================
// BANANA
// ======================================================

function drawBanana(r) {
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
        "smile"
    );

    ctx.restore();
}

// ======================================================
// COCONUT
// ======================================================

function drawCoconut(r) {
    drawBody(
        r,
        "#a97846",
        "#75452b",
        "#3e2518"
    );

    // Coconut shell texture

    ctx.strokeStyle =
        "rgba(35,20,10,.25)";

    ctx.lineWidth =
        Math.max(
            1,
            r * 0.025
        );

    for (
        let i = -2;
        i <= 2;
        i++
    ) {
        ctx.beginPath();

        ctx.moveTo(
            -r * 0.60,
            i * r * 0.30
        );

        ctx.quadraticCurveTo(
            0,
            i * r * 0.18,
            r * 0.60,
            i * r * 0.30
        );

        ctx.stroke();
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
        "smile"
    );
}

// ======================================================
// LEMON
// ======================================================

function drawLemon(r) {
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
        "smile"
    );
}

// ======================================================
// BLUEBERRY
// ======================================================

function drawBlueberry(r) {
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
            i * (
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
        "smile"
    );
}

// ======================================================
// AVOCADO
// ======================================================

function drawAvocado(r) {
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

    ctx.strokeStyle =
        "rgba(45,80,35,.35)";

    ctx.stroke();

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
        "smile"
    );

    ctx.restore();
}

// ======================================================
// DRAGON FRUIT
// ======================================================

function drawDragonFruit(r) {
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

    // Pink outer scales

    ctx.strokeStyle =
        "#d82d79";

    ctx.lineWidth =
        Math.max(
            1,
            r * 0.035
        );

    for (
        let i = -2;
        i <= 2;
        i++
    ) {
        ctx.beginPath();

        ctx.moveTo(
            i * r * 0.30,
            -r * 0.90
        );

        ctx.quadraticCurveTo(
            i * r * 0.42,
            -r * 0.62,
            i * r * 0.32,
            -r * 0.45
        );

        ctx.stroke();
    }

    drawFace(
        r * 0.72,
        "smile"
    );
}

// ======================================================
// PAPAYA
// ======================================================

function drawPapaya(r) {
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
        "smile"
    );
}

// ======================================================
// GOLDEN FRUIT
// ======================================================

function drawGoldenFruit(r) {
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

    ctx.strokeStyle =
        "#f7c948";

    ctx.lineWidth =
        Math.max(
            2,
            r * 0.06
        );

    ctx.stroke();

    // Sparkle ring

    ctx.strokeStyle =
        "rgba(255,255,255,.55)";

    ctx.lineWidth =
        Math.max(
            1,
            r * 0.025
        );

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        r * 0.82,
        0,
        Math.PI * 2
    );

    ctx.stroke();

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
        "open"
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
    color
) {
    drawBody(
        r,
        "#ffffff",
        color,
        "#553525"
    );

    drawFace(
        r,
        "smile"
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
    // BACKGROUND
    // ==================================================

    const bg =
        ctx.createLinearGradient(
            0,
            0,
            0,
            canvas.height
        );

    bg.addColorStop(
        0,
        "#fff4d8"
    );

    bg.addColorStop(
        0.48,
        "#fff9e9"
    );

    bg.addColorStop(
        1,
        "#f7d99b"
    );

    ctx.fillStyle =
        bg;

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
        "rgba(255,255,255,.42)"
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

        dropX = Math.max(
            r,
            Math.min(
                canvas.width - r,
                dropX
            )
        );

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

        ctx.setLineDash([]);

        drawFruit({
            x:
                dropX,

            y:
                40,

            type:
                currentFruit,

            angle:
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

    if (paused) {
        overlay(
            "PAUSED"
        );
    }

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
            (f.age || 0) < 0.8
        ) {
            continue;
        }

        // ==================================================
        // DANGER ZONE
        // ==================================================

        if (
            top <= DANGER_Y
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
                f.dangerTimer >= 0.7
            ) {
                // Set game over FIRST.
                // This prevents multiple triggers.

                over = true;

                // Trigger game-over handling
                // immediately.

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

        // Don't keep creating animation frames
        // after Game Over.

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

    gameOverSoundPlayed = true;

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
