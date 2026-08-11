// ======================================================
// MAIN CONTROLLER
// ======================================================

import {
    loadData,
    saveData
} from "./storage.js";

import {
    renderMissions
} from "./missions.js";

import {
    dailyInfo,
    claimDaily
} from "./rewards.js";

import {
    initGame
} from "./game.js";

import {
    initAudio,
    playSound,
    startMusic,
    stopMusic,
    setSoundEnabled,
    setMusicEnabled
} from "./audio.js";


// ======================================================
// DATA
// ======================================================

const data =
    loadData();


// ======================================================
// INITIALIZE AUDIO
// ======================================================

initAudio(
    data
);


// ======================================================
// SHORTCUT
// ======================================================

const $ = id =>
    document.getElementById(id);


// ======================================================
// SCREENS
// ======================================================

const screens = [

    "homeScreen",
    "gameScreen",
    "missionsScreen",
    "dailyScreen",
    "settingsScreen",
    "resultsScreen"

];


// ======================================================
// SHOW SCREEN
// ======================================================

function show(id) {

    screens.forEach(
        screen => {

            const element =
                $(screen);


            if (element) {

                element.classList.toggle(
                    "hidden",
                    screen !== id
                );

            }

        }
    );

}


// ======================================================
// HOME
// ======================================================

function home() {

    // --------------------------------------------------
    // UPDATE COINS
    // --------------------------------------------------

    if ($("homeCoins")) {

        $("homeCoins").textContent =
            data.coins || 0;

    }


    // --------------------------------------------------
    // UPDATE HIGH SCORE
    // --------------------------------------------------

    if ($("homeHighScore")) {

        $("homeHighScore").textContent =
            data.highScore || 0;

    }


    // --------------------------------------------------
    // UPDATE LEVEL
    // --------------------------------------------------

    if ($("homeLevel")) {

        $("homeLevel").textContent =
            data.level || 1;

    }


    // --------------------------------------------------
    // SHOW HOME
    // --------------------------------------------------

    show(
        "homeScreen"
    );


    // --------------------------------------------------
    // KEEP MUSIC PLAYING
    // --------------------------------------------------

    startMusic();


    // --------------------------------------------------
    // SAVE DATA
    // --------------------------------------------------

    saveData(
        data
    );

}

// ======================================================
// MISSIONS
// ======================================================

function missions() {

    renderMissions(

        data,

        $("missionList"),

        mission => {

            // ==================================================
            // MAKE SURE MISSIONS EXISTS
            // ==================================================

            if (!data.missions) {

                data.missions = {};

            }


            // ==================================================
            // GET COMPLETION COUNT
            // ==================================================

            let completed =
                data.missions[
                    mission.id
                ];


            // ==================================================
            // OLD SAVE COMPATIBILITY
            // ==================================================

            if (completed === true) {

                completed = 1;

            }

            else {

                completed =
                    Number(completed) || 0;

            }


            // ==================================================
            // ONE-TIME MISSION
            // ==================================================

            if (
                mission.oneTime &&
                completed >= 1
            ) {

                return;

            }


            // ==================================================
            // ADD REWARD
            // ==================================================

            data.coins =
                (data.coins || 0) +
                mission.reward;


            // ==================================================
            // INCREASE COMPLETION COUNT
            // ==================================================

            data.missions[
                mission.id
            ] =
                completed + 1;


            // ==================================================
            // PLAY REWARD SOUND
            // ==================================================

            playSound(
                "daily"
            );


            // ==================================================
            // SAVE DATA
            // ==================================================

            saveData(
                data
            );


            // ==================================================
            // REFRESH MISSIONS
            // ==================================================

            missions();

        }

    );


    // ==================================================
    // SHOW MISSIONS
    // ==================================================

    show(
        "missionsScreen"
    );


    // ==================================================
    // KEEP MUSIC PLAYING
    // ==================================================

    startMusic();

}


// ======================================================
// DAILY REWARD
// ======================================================

function daily() {

    const info =
        dailyInfo(
            data
        );


    // ==================================================
    // STREAK
    // ==================================================

    if ($("dailyStreak")) {

        $("dailyStreak").innerHTML = `

            <div class="streak">
                Day ${info.day} of 7
            </div>

            <p>
                ${
                    info.claimed
                        ? "Come back tomorrow!"
                        : "Today's reward is ready."
                }
            </p>

        `;

    }


    // ==================================================
    // REWARD
    // ==================================================

    if ($("dailyReward")) {

        $("dailyReward").innerHTML = `

            <div class="reward">
                🪙 ${info.amount}
            </div>

        `;

    }


    // ==================================================
    // CLAIM BUTTON
    // ==================================================

    if ($("claimDaily")) {

        $("claimDaily").disabled =
            info.claimed;


        $("claimDaily").textContent =
            info.claimed
                ? "CLAIMED"
                : "CLAIM";

    }


    // ==================================================
    // SHOW DAILY
    // ==================================================

    show(
        "dailyScreen"
    );


    // ==================================================
    // KEEP MUSIC PLAYING
    // ==================================================

    startMusic();

}


// ======================================================
// SETTINGS
// ======================================================

function settings() {

    updateSettingsUI();


    show(
        "settingsScreen"
    );


    // --------------------------------------------------
    // KEEP MUSIC PLAYING
    // --------------------------------------------------

    startMusic();

}


// ======================================================
// UPDATE SETTINGS UI
// ======================================================

function updateSettingsUI() {

    const sound =
        data.sound !== false;


    const music =
        data.music !== false;


    // ==================================================
    // SOUND BUTTON
    // ==================================================

    if ($("settingsSoundButton")) {

        $("settingsSoundButton").textContent =
            sound
                ? "🔊"
                : "🔇";

    }


    // ==================================================
    // OPTIONAL SOUND BUTTON
    // ==================================================

    if ($("soundButton")) {

        $("soundButton").textContent =
            sound
                ? "🔊 Sound"
                : "🔇 Sound";

    }


    // ==================================================
    // MUSIC BUTTON
    // ==================================================

    if ($("settingsMusicButton")) {

        $("settingsMusicButton").textContent =
            music
                ? "🎵"
                : "🔇";

    }


    // ==================================================
    // OPTIONAL MUSIC BUTTON
    // ==================================================

    if ($("musicButton")) {

        $("musicButton").textContent =
            music
                ? "🎵 Music"
                : "🔇 Music";

    }

}


// ======================================================
// START GAME
// ======================================================

function start() {

    // ==================================================
    // SHOW GAME
    // ==================================================

    show(
        "gameScreen"
    );


    // ==================================================
    // START MUSIC
    // ==================================================

    startMusic();


    // ==================================================
    // INITIALIZE GAME
    // ==================================================

    initGame(

        {

            canvas:
                $("gameCanvas"),

            score:
                $("score"),

            coins:
                $("coins"),

            best:
                $("gameHighScore"),

            next:
                $("nextFruit"),

            pause:
                $("pauseButton")

        },

        data,

        result => {

            // ==================================================
            // FINAL SCORE
            // ==================================================

            if ($("finalScore")) {

                $("finalScore").textContent =
                    result.score;

            }


            // ==================================================
            // EARNED COINS
            // ==================================================

            if ($("earnedCoins")) {

                $("earnedCoins").textContent =
                    result.coins;

            }


            // ==================================================
            // NEW HIGH SCORE
            // ==================================================

            if ($("newBest")) {

                $("newBest").classList.toggle(

                    "hidden",

                    !result.newBest

                );

            }


            // ==================================================
            // SAVE DATA
            // ==================================================

            saveData(
                data
            );


            // ==================================================
            // STOP MUSIC
            // ==================================================

            stopMusic();


            // ==================================================
            // SHOW RESULTS
            // ==================================================

            show(
                "resultsScreen"
            );

        }

    );

}


// ======================================================
// PLAY BUTTON
// ======================================================

if ($("playButton")) {

    $("playButton").onclick = () => {

        startMusic();

        start();

    };

}


// ======================================================
// MISSIONS BUTTON
// ======================================================

if ($("missionsButton")) {

    $("missionsButton").onclick = () => {

        startMusic();

        missions();

    };

}


// ======================================================
// DAILY BUTTON
// ======================================================

if ($("dailyButton")) {

    $("dailyButton").onclick = () => {

        startMusic();

        daily();

    };

}


// ======================================================
// SETTINGS BUTTON
// ======================================================

if ($("settingsButton")) {

    $("settingsButton").onclick = () => {

        startMusic();

        settings();

    };

}


// ======================================================
// MISSIONS BACK BUTTON
// ======================================================

if ($("missionsBack")) {

    $("missionsBack").onclick = () => {

        home();

    };

}


// ======================================================
// DAILY BACK BUTTON
// ======================================================

if ($("dailyBack")) {

    $("dailyBack").onclick = () => {

        home();

    };

}


// ======================================================
// SETTINGS BACK BUTTON
// ======================================================

if ($("settingsBack")) {

    $("settingsBack").onclick = () => {

        home();

    };

}


// ======================================================
// GAME HOME BUTTON
// ======================================================

if ($("homeButton")) {

    $("homeButton").onclick = () => {

        home();

    };

}


// ======================================================
// RESULTS HOME BUTTON
// ======================================================

if ($("resultHome")) {

    $("resultHome").onclick = () => {

        home();

    };

}


// ======================================================
// PLAY AGAIN BUTTON
// ======================================================

if ($("resultAgain")) {

    $("resultAgain").onclick = () => {

        start();

    };

}


// ======================================================
// DAILY CLAIM BUTTON
// ======================================================

if ($("claimDaily")) {

    $("claimDaily").onclick = () => {

        const claimed =
            claimDaily(
                data
            );


        if (claimed) {

            // --------------------------------------------------
            // REWARD SOUND
            // --------------------------------------------------

            playSound(
                "daily"
            );


            // --------------------------------------------------
            // SAVE DATA
            // --------------------------------------------------

            saveData(
                data
            );


            // --------------------------------------------------
            // REFRESH DAILY
            // --------------------------------------------------

            daily();

        }

    };

}


// ======================================================
// SETTINGS SOUND BUTTON
// ======================================================

if ($("settingsSoundButton")) {

    $("settingsSoundButton").onclick = () => {

        data.sound =
            data.sound === false;


        setSoundEnabled(
            data.sound
        );


        saveData(
            data
        );


        updateSettingsUI();

    };

}


// ======================================================
// OPTIONAL SOUND BUTTON
// ======================================================

if ($("soundButton")) {

    $("soundButton").onclick = () => {

        data.sound =
            data.sound === false;


        setSoundEnabled(
            data.sound
        );


        saveData(
            data
        );


        updateSettingsUI();

    };

}


// ======================================================
// SETTINGS MUSIC BUTTON
// ======================================================

if ($("settingsMusicButton")) {

    $("settingsMusicButton").onclick = () => {

        data.music =
            data.music === false;


        setMusicEnabled(
            data.music
        );


        saveData(
            data
        );


        updateSettingsUI();


        if (data.music) {

            startMusic();

        }

    };

}


// ======================================================
// OPTIONAL MUSIC BUTTON
// ======================================================

if ($("musicButton")) {

    $("musicButton").onclick = () => {

        data.music =
            data.music === false;


        setMusicEnabled(
            data.music
        );


        saveData(
            data
        );


        updateSettingsUI();


        if (data.music) {

            startMusic();

        }

    };

}


// ======================================================
// INITIALIZE AUDIO SETTINGS
// ======================================================

setSoundEnabled(
    data.sound !== false
);

setMusicEnabled(
    data.music !== false
);


// ======================================================
// INITIALIZE UI
// ======================================================

updateSettingsUI();


// ======================================================
// INITIAL SCREEN
// ======================================================

home();
