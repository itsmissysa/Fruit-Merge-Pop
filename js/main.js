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
    "achievementsScreen",
    "themesScreen",
    "howToPlayScreen",
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

            const reward =
                mission.oneTime
                    ? mission.reward
                    : mission.reward * (completed + 1);

            data.coins =
                (data.coins || 0) +
                reward;


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
// 🏆 FRUITY MERGE POP — TIERED ACHIEVEMENTS
// ======================================================

const ACHIEVEMENTS = [

    // ==================================================
    // 🍉 FRUIT MERGES
    // ==================================================

    {
        id: "fruitMerges",
        icon: "🍉",
        title: "FRUIT MERGES",
        description: "Merge fruits to reach new milestones!",
        type: "merges",

        tiers: [
            {
                goal: 1,
                reward: 50
            },
            {
                goal: 20,
                reward: 100
            },
            {
                goal: 50,
                reward: 250
            },
            {
                goal: 100,
                reward: 500
            },
            {
                goal: 250,
                reward: 1000
            },
            {
                goal: 500,
                reward: 2000
            }
        ]
    },


    // ==================================================
    // 🏆 HIGH SCORER
    // ==================================================

    {
        id: "highScore",
        icon: "🏆",
        title: "HIGH SCORER",
        description: "Reach higher scores!",
        type: "score",

        tiers: [
            {
                goal: 1000,
                reward: 50
            },
            {
                goal: 2500,
                reward: 100
            },
            {
                goal: 5000,
                reward: 250
            },
            {
                goal: 10000,
                reward: 500
            },
            {
                goal: 25000,
                reward: 1000
            }
        ]
    },


    // ==================================================
    // 💰 COIN COLLECTOR
    // ==================================================

    {
        id: "coinCollector",
        icon: "💰",
        title: "COIN COLLECTOR",
        description: "Collect more and more coins!",
        type: "coins",

        tiers: [
            {
                goal: 500,
                reward: 50
            },
            {
                goal: 1000,
                reward: 100
            },
            {
                goal: 2500,
                reward: 250
            },
            {
                goal: 5000,
                reward: 500
            },
            {
                goal: 10000,
                reward: 1000
            }
        ]
    }

];


// ======================================================
// GET ACHIEVEMENT PROGRESS
// ======================================================

function getAchievementProgress(achievement) {

    const currentData =
        loadData();


    // ==================================================
    // FRUIT MERGES
    // ==================================================

    if (achievement.type === "merges") {

        return Number(
            currentData.totalMerges
        ) || 0;

    }


    // ==================================================
    // HIGH SCORE
    // ==================================================

    if (achievement.type === "score") {

        return Number(
            currentData.highScore
        ) || 0;

    }


    // ==================================================
    // TOTAL COINS EARNED
    // ==================================================

    if (achievement.type === "coins") {

        /*
         * Use totalCoinsEarned instead of current coins.
         *
         * This means spending coins will NOT make your
         * achievement progress go backwards.
         */

        return Number(
            currentData.totalCoinsEarned
        ) || 0;

    }


    return 0;

}


// ======================================================
// GET CLAIMED ACHIEVEMENT TIERS
// ======================================================

function getClaimedAchievementTiers(
    achievementId
) {

    const currentData =
        loadData();


    if (
        !currentData.achievements ||
        typeof currentData.achievements !== "object"
    ) {

        currentData.achievements = {};

    }


    if (
        !Array.isArray(
            currentData.achievements[
                achievementId
            ]
        )
    ) {

        currentData.achievements[
            achievementId
        ] = [];

    }


    return currentData.achievements[
        achievementId
    ];

}


// ======================================================
// SAVE CLAIMED TIER
// ======================================================

function saveAchievementTier(
    achievementId,
    tierIndex
) {

    if (
        !data.achievements ||
        typeof data.achievements !== "object"
    ) {

        data.achievements = {};

    }


    if (
        !Array.isArray(
            data.achievements[
                achievementId
            ]
        )
    ) {

        data.achievements[
            achievementId
        ] = [];

    }


    if (
        !data.achievements[
            achievementId
        ].includes(tierIndex)
    ) {

        data.achievements[
            achievementId
        ].push(tierIndex);

    }


    saveData(
        data
    );

}


// ======================================================
// CHECK AND REWARD COMPLETED TIERS
// ======================================================

function checkAchievementRewards(
    achievement,
    progress
) {

    const claimed =
        getClaimedAchievementTiers(
            achievement.id
        );


    achievement.tiers.forEach(
        (tier, index) => {

            // ------------------------------------------
            // ALREADY CLAIMED
            // ------------------------------------------

            if (
                claimed.includes(index)
            ) {

                return;

            }


            // ------------------------------------------
            // TIER COMPLETED
            // ------------------------------------------

            if (
                progress >= tier.goal
            ) {

                // --------------------------------------
                // GIVE COINS
                // --------------------------------------

                data.coins =
                    (data.coins || 0) +
                    tier.reward;


                // --------------------------------------
                // RECORD TIER
                // --------------------------------------

                if (
                    !data.achievements ||
                    typeof data.achievements !== "object"
                ) {

                    data.achievements = {};

                }


                if (
                    !Array.isArray(
                        data.achievements[
                            achievement.id
                        ]
                    )
                ) {

                    data.achievements[
                        achievement.id
                    ] = [];

                }


                data.achievements[
                    achievement.id
                ].push(index);


                // --------------------------------------
                // SAVE
                // --------------------------------------

                saveData(
                    data
                );


                // --------------------------------------
                // SOUND
                // --------------------------------------

                playSound(
                    "daily"
                );

            }

        }
    );

}


// ======================================================
// RENDER ACHIEVEMENTS
// ======================================================

function renderAchievements() {

    const list =
        $("achievementList");


    if (!list) {

        return;

    }


    list.innerHTML = "";


    ACHIEVEMENTS.forEach(
        achievement => {

            // ==========================================
            // CURRENT PROGRESS
            // ==========================================

            const progress =
                getAchievementProgress(
                    achievement
                );


            // ==========================================
            // CHECK COMPLETED TIERS
            // ==========================================

            checkAchievementRewards(
                achievement,
                progress
            );


            // ==========================================
            // GET CLAIMED TIERS
            // ==========================================

            const claimed =
                getClaimedAchievementTiers(
                    achievement.id
                );


            // ==========================================
            // FIND NEXT TIER
            // ==========================================

            let nextTierIndex =
                achievement.tiers.findIndex(
                    tier =>
                        progress < tier.goal
                );


            // ==========================================
            // ALL TIERS COMPLETE
            // ==========================================

            const allCompleted =
                nextTierIndex === -1;


            // ==========================================
            // IF EVERYTHING IS COMPLETE
            // ==========================================

            if (allCompleted) {

                const card =
                    document.createElement("div");


                card.className =
                    "achievement completed";


                card.innerHTML = `

                    <span>
                        🏆
                    </span>

                    <div>

                        <strong>
                            ${achievement.title}
                        </strong>

                        <small>
                            ALL TIERS COMPLETE! 🎉
                        </small>

                        <div class="progress">
                            <i style="width:100%"></i>
                        </div>

                        <small>
                            ALL ACHIEVEMENTS UNLOCKED 👑
                        </small>

                    </div>

                `;


                list.appendChild(
                    card
                );


                return;

            }


            // ==========================================
            // CURRENT TIER
            // ==========================================

            const tier =
                achievement.tiers[
                    nextTierIndex
                ];


            // ==========================================
            // PREVIOUS COMPLETED TIERS
            // ==========================================

            const completedCount =
                claimed.length;


            // ==========================================
            // CURRENT TIER PROGRESS
            // ==========================================

            const tierProgress =
                Math.min(
                    progress,
                    tier.goal
                );


            const percentage =
                Math.min(
                    (
                        tierProgress /
                        tier.goal
                    ) * 100,
                    100
                );


            // ==========================================
            // CREATE CARD
            // ==========================================

            const card =
                document.createElement("div");


            card.className =
                "achievement " +
                (
                    completedCount > 0
                        ? "completed"
                        : "locked"
                );


            card.innerHTML = `

                <span>
                    ${
                        completedCount > 0
                            ? "🏆"
                            : achievement.icon
                    }
                </span>

                <div>

                    <strong>
                        ${achievement.title}
                    </strong>

                    <small>
                        ${achievement.description}
                    </small>

                    <small>
                        ${
                            completedCount
                        } tier${
                            completedCount === 1
                                ? ""
                                : "s"
                        } completed
                    </small>

                    <div class="progress">
                        <i
                            style="
                                width:${percentage}%
                            "
                        ></i>
                    </div>

                    <small>
                        ${tierProgress} /
                        ${tier.goal}
                    </small>

                    <small>
                        🪙 Reward:
                        ${tier.reward}
                    </small>

                </div>

            `;


            list.appendChild(
                card
            );

        }
    );

}


// ======================================================
// ACHIEVEMENTS BUTTON
// ======================================================

if ($("achievementsButton")) {

    $("achievementsButton").onclick = () => {

        show(
            "achievementsScreen"
        );


        renderAchievements();


        startMusic();

    };

}


// ======================================================
// ACHIEVEMENTS BUTTON
// ======================================================

if ($("achievementsButton")) {

    $("achievementsButton").onclick = () => {

        show(
            "achievementsScreen"
        );


        renderAchievements();


        startMusic();

    };

}

// ======================================================
// FRUITY MERGE POP — THEMES DATA
// ======================================================

const themes = [
    {
        id: "tropical",
        name: "Tropical Paradise",
        description: "Fresh fruits, sunny vibes & island fun!",
        preview: "assets/images/themes/tropical-theme.jpg",
        background: "assets/images/themes/tropical-theme.jpg",
        unlocked: true
    },

    {
        id: "strawberry",
        name: "Strawberry Garden",
        description: "Sweet pink strawberry vibes!",
        preview: "assets/images/themes/strawberry-theme.jpg",
        background: "assets/images/themes/strawberry-theme.jpg",
        unlocked: false
    },

    {
        id: "sunset",
        name: "Golden Sunset",
        description: "Warm colors for a cozy game!",
        preview: "assets/images/themes/sunset-theme.jpg",
        background: "assets/images/themes/sunset-theme.jpg",
        unlocked: false
    },

    {
        id: "candy",
        name: "Candy World",
        description: "Cute, colorful and extra sweet!",
        preview: "assets/images/themes/candy-theme.jpg",
        background: "assets/images/themes/candy-theme.jpg",
        unlocked: false
    }
];


// ======================================================
// THEME SYSTEM
// ======================================================

const THEME_STORAGE_KEY =
    "fruityMergePop_selectedTheme";

const THEME_UNLOCK_KEY =
    "fruityMergePop_unlockedThemes";


// ======================================================
// GET SELECTED THEME
// ======================================================

function getSelectedTheme() {

    return localStorage.getItem(
        THEME_STORAGE_KEY
    ) || "tropical";

}


// ======================================================
// GET UNLOCKED THEMES
// ======================================================

function getUnlockedThemes() {

    // ALL THEMES ARE CURRENTLY UNLOCKED
    return themes.map(
        theme => theme.id
    );

}


// ======================================================
// SAVE UNLOCKED THEMES
// ======================================================

function saveUnlockedThemes(unlocked) {

    localStorage.setItem(
        THEME_UNLOCK_KEY,
        JSON.stringify(unlocked)
    );

}


// ======================================================
// APPLY THEME
// ======================================================

function applyTheme(theme) {

    if (!theme) return;

    const gameScreen =
        $("gameScreen");

    if (gameScreen) {

        gameScreen.style.backgroundImage =
            `url("${theme.background}")`;

        gameScreen.style.backgroundSize =
            "cover";

        gameScreen.style.backgroundPosition =
            "center";

        gameScreen.style.backgroundRepeat =
            "no-repeat";

    }

    document.documentElement.style.setProperty(
        "--current-game-background",
        `url("${theme.background}")`
    );

}


// ======================================================
// LOAD CURRENT THEME
// ======================================================

function loadCurrentTheme() {

    const selectedId =
        getSelectedTheme();

    const theme =
        themes.find(
            t => t.id === selectedId
        );

    if (theme) {
        applyTheme(theme);
    }

}


// ======================================================
// SELECT THEME
// ======================================================

function selectTheme(themeId) {

    const theme =
        themes.find(
            t => t.id === themeId
        );

    if (!theme) return;

    const unlockedThemes =
        getUnlockedThemes();

    if (!unlockedThemes.includes(themeId)) {

        console.log(
            "Theme is still locked."
        );

        return;

    }

    // Save selected theme
    localStorage.setItem(
        THEME_STORAGE_KEY,
        themeId
    );

    // Apply background immediately
    applyTheme(theme);

    // Refresh theme cards
    renderThemes();

}


// ======================================================
// RENDER THEMES
// ======================================================

function renderThemes() {

    const list =
        $("themeList");

    if (!list) return;

    list.innerHTML = "";

    const selectedTheme =
        getSelectedTheme();

    const unlockedThemes =
        getUnlockedThemes();


    themes.forEach(theme => {

        const isUnlocked =
            unlockedThemes.includes(
                theme.id
            );

        const isSelected =
            selectedTheme === theme.id;


        const card =
            document.createElement("div");


        card.className =
            "theme-card" +
            (isSelected
                ? " selected"
                : "") +
            (!isUnlocked
                ? " locked"
                : "");


        card.innerHTML = `

            <img
                src="${theme.preview}"
                alt="${theme.name}"
            >

            <div>

                <strong>
                    ${theme.name}
                </strong>

                <small>
                    ${theme.description}
                </small>

            </div>

            <button
                data-theme="${theme.id}"
                ${!isUnlocked ? "disabled" : ""}
            >
                ${
                    isSelected
                        ? "SELECTED"
                        : isUnlocked
                            ? "SELECT"
                            : "LOCKED"
                }
            </button>

        `;


        list.appendChild(card);

    });


    // ==================================================
    // THEME BUTTONS
    // ==================================================

    list
        .querySelectorAll(
            "button[data-theme]"
        )
        .forEach(button => {

            button.onclick = () => {

                const themeId =
                    button.dataset.theme;

                selectTheme(themeId);

            };

        });

}


// ======================================================
// THEMES BUTTON
// ======================================================

if ($("themesButton")) {

    $("themesButton").onclick = () => {

        show(
            "themesScreen"
        );

        renderThemes();

        startMusic();

    };

}


// ======================================================
// LOAD THEME WHEN GAME STARTS
// ======================================================

loadCurrentTheme();


// ======================================================
// HOW TO PLAY BUTTON
// ======================================================

if ($("howToPlayButton")) {

    $("howToPlayButton").onclick = () => {

        show(
            "howToPlayScreen"
        );

        startMusic();

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
// ACHIEVEMENTS BACK BUTTON
// ======================================================

if ($("achievementsBack")) {

    $("achievementsBack").onclick = () => {

        home();

    };

}


// ======================================================
// THEMES BACK BUTTON
// ======================================================

if ($("themesBack")) {

    $("themesBack").onclick = () => {

        home();

    };

}


// ======================================================
// HOW TO PLAY BACK BUTTON
// ======================================================

if ($("howToPlayBack")) {

    $("howToPlayBack").onclick = () => {

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