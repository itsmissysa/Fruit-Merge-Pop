const KEY = "fruitMergeSaveV1";

const DEFAULT = {
    coins: 0,
    highScore: 0,
    level: 1,
    totalMerges: 0,
    totalScore: 0,
    bestFruit: 0,

    // Missions
    missions: {},

    // Daily rewards
    lastDaily: null,
    dailyDay: 0,

    // Audio
    sound: true,
    music: true,

    // Shop
    ownedSkins: ["default"],
    selectedSkin: "default",

    // Themes
    ownedThemes: ["default"],
    selectedTheme: "default",

    // Achievements
    achievements: {},

    // Extra progress
    gamesPlayed: 0,
    totalCoinsEarned: 0,

    // Special fruit progress
    goldenFruitCreated: false
};


// ======================================================
// LOAD DATA
// ======================================================

export function loadData() {

    try {

        const saved =
            JSON.parse(
                localStorage.getItem(KEY) || "{}"
            );

        return {

            ...DEFAULT,

            ...saved,

            // Make sure these objects/arrays
            // always exist even with an old save.

            missions:
                saved.missions || {},

            achievements:
                saved.achievements || {},

            ownedSkins:
                saved.ownedSkins || ["default"],

            ownedThemes:
                saved.ownedThemes || ["default"]

        };

    } catch (error) {

        console.error(
            "Could not load saved data:",
            error
        );

        return {
            ...DEFAULT
        };

    }

}


// ======================================================
// SAVE DATA
// ======================================================

export function saveData(data) {

    try {

        localStorage.setItem(
            KEY,
            JSON.stringify(data)
        );

        return true;

    } catch (error) {

        console.error(
            "Could not save data:",
            error
        );

        return false;

    }

}