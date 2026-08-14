// ======================================================
// AUDIO MANAGER
// ======================================================

// Background music
let music = null;


// ======================================================
// SOUND EFFECTS
// ======================================================

const sounds = {

    drop:
        new Audio("./assets/sounds/drop.mp3"),

    merge:
        new Audio("./assets/sounds/merge.mp3"),

    pause:
        new Audio("./assets/sounds/pause.mp3"),

    daily:
        new Audio("./assets/sounds/daily.mp3"),

    gameover:
        new Audio("./assets/sounds/game-over.mp3")

};


// ======================================================
// AUDIO SETTINGS
// ======================================================

let soundEnabled = true;
let musicEnabled = true;


// ======================================================
// INITIALIZE AUDIO
// ======================================================

export function initAudio(data = {}) {

    soundEnabled =
        data.sound !== false;

    musicEnabled =
        data.music !== false;


    // ==================================================
    // BACKGROUND MUSIC
    // ==================================================

    if (!music) {

        music =
            document.getElementById(
                "backgroundMusic"
            );


        if (!music) {

            music =
                new Audio(
                    "./assets/sounds/background.mp3"
                );

        }


        music.loop = true;

        music.volume = 0.25;

        music.preload = "auto";

    }


    // ==================================================
    // SOUND EFFECTS
    // ==================================================

    Object.entries(sounds).forEach(
        ([name, sound]) => {

            sound.volume = 0.7;

            sound.preload = "auto";

            sound.load();

            // Helpful error detection
            sound.addEventListener(
                "error",
                () => {

                    console.warn(
                        `Audio file could not be loaded: ${name}`
                    );

                },
                {
                    once: true
                }
            );

        }
    );

}


// ======================================================
// SOUND ENABLE / DISABLE
// ======================================================

export function setSoundEnabled(enabled) {

    soundEnabled =
        Boolean(enabled);

}


// ======================================================
// MUSIC ENABLE / DISABLE
// ======================================================

export function setMusicEnabled(enabled) {

    musicEnabled =
        Boolean(enabled);


    if (!musicEnabled) {

        stopMusic();

    }

}


// ======================================================
// PLAY SOUND EFFECT
// ======================================================

export function playSound(name) {

    // --------------------------------------------------
    // SOUND DISABLED
    // --------------------------------------------------

    if (!soundEnabled) {

        return;

    }


    // --------------------------------------------------
    // FIND SOUND
    // --------------------------------------------------

    const sound =
        sounds[name];


    if (!sound) {

        console.warn(
            `Sound "${name}" was not found.`
        );

        return;

    }


    // --------------------------------------------------
    // PLAY SOUND
    // --------------------------------------------------

    try {

        sound.pause();

        sound.currentTime = 0;


        const promise =
            sound.play();


        if (
            promise &&
            typeof promise.catch ===
            "function"
        ) {

            promise.catch(
                error => {

                    console.warn(
                        `Sound "${name}" could not play:`,
                        error
                    );

                }
            );

        }

    } catch (error) {

        console.warn(
            `Sound "${name}" could not play:`,
            error
        );

    }

}


// ======================================================
// START BACKGROUND MUSIC
// ======================================================

export function startMusic() {

    if (!musicEnabled) {

        return;

    }


    if (!music) {

        return;

    }


    try {

        // Don't restart already-playing music
        if (!music.paused) {

            return;

        }


        const promise =
            music.play();


        if (
            promise &&
            typeof promise.catch ===
            "function"
        ) {

            promise.catch(
                error => {

                    console.warn(
                        "Background music could not play:",
                        error
                    );

                }
            );

        }

    } catch (error) {

        console.warn(
            "Music could not play:",
            error
        );

    }

}


// ======================================================
// STOP BACKGROUND MUSIC
// ======================================================

export function stopMusic() {

    if (!music) {

        return;

    }


    try {

        music.pause();

        music.currentTime = 0;

    } catch (error) {

        console.warn(
            "Music could not stop:",
            error
        );

    }

}


// ======================================================
// PAUSE BACKGROUND MUSIC
// ======================================================

export function pauseMusic() {

    if (!music) {

        return;

    }


    try {

        music.pause();

    } catch (error) {

        console.warn(
            "Music could not pause:",
            error
        );

    }

}


// ======================================================
// TOGGLE MUSIC
// ======================================================

export function toggleMusic() {

    musicEnabled =
        !musicEnabled;


    if (musicEnabled) {

        startMusic();

    } else {

        stopMusic();

    }


    return musicEnabled;

}


// ======================================================
// GET AUDIO SETTINGS
// ======================================================

export function isSoundEnabled() {

    return soundEnabled;

}


export function isMusicEnabled() {

    return musicEnabled;

}