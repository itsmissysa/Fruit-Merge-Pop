// ======================================================
// MISSIONS
// ======================================================

export const MISSION_DEFS = [

    // ==================================================
    // SCORE MISSION — REPEATING / PROGRESSIVE
    // ==================================================
    // 500 → 1000 → 1500 → 2000 ...
    {
        id: "score",
        title: "Reach {goal} points",
        type: "score",
        baseGoal: 500,
        reward: 100
    },

    // ==================================================
    // MERGE MISSION — REPEATING / PROGRESSIVE
    // ==================================================
    // 5 → 10 → 15 → 20 ... merges
    {
        id: "merges",
        title: "Make {goal} merges",
        type: "merges",
        baseGoal: 5,
        reward: 50
    },

    // ==================================================
    // GOLDEN FRUIT — ONE TIME
    // ==================================================

    {
        id: "goldenFruit",
        title: "Create a Golden Fruit",
        type: "fruit",
        goal: 1,
        reward: 250,
        oneTime: true
    }
];


// ======================================================
// COMPLETED COUNT
// ======================================================

function getCompletedCount(data, mission) {
    if (!data.missions) {
        return 0;
    }

    const value = data.missions[mission.id];

    // Old save compatibility.
    if (value === true) {
        return 1;
    }

    return Number(value) || 0;
}


// ======================================================
// CURRENT GOAL
// ======================================================

function getGoal(data, mission) {
    if (mission.oneTime) {
        return mission.goal || 1;
    }

    const completed = getCompletedCount(data, mission);

    // Every time the player claims the mission, the next
    // target becomes harder.
    return mission.baseGoal * (completed + 1);
}


// ======================================================
// CURRENT REWARD
// ======================================================

function getReward(data, mission) {
    const completed = getCompletedCount(data, mission);

    if (mission.oneTime) {
        return mission.reward;
    }

    // Reward also grows with the mission cycle.
    return mission.reward * (completed + 1);
}


// ======================================================
// CUMULATIVE TARGET BEFORE CURRENT MISSION
// ======================================================

function getPreviousTotal(mission, completed) {
    if (completed <= 0) {
        return 0;
    }

    // For a base goal of 500:
    // cycle 1 = 500
    // cycle 2 = 1000
    // cycle 3 = 1500
    // cumulative before cycle N is the sum of all
    // previously completed targets.
    return mission.baseGoal *
        completed *
        (completed + 1) / 2;
}


// ======================================================
// CURRENT PROGRESS
// ======================================================

function getMissionProgress(data, mission, goal) {
    const completed = getCompletedCount(data, mission);

    // ==================================================
    // GOLDEN FRUIT
    // ==================================================

    if (mission.type === "fruit") {
        return data.goldenFruitCreated ? goal : 0;
    }

    let total = 0;

    if (mission.type === "score") {
        total = Number(data.totalScore) || 0;
    }

    else if (mission.type === "merges") {
        total = Number(data.totalMerges) || 0;
    }

    const previousTotal =
        getPreviousTotal(
            mission,
            completed
        );

    return Math.min(
        Math.max(
            total - previousTotal,
            0
        ),
        goal
    );
}


// ======================================================
// RENDER MISSIONS
// ======================================================

export function renderMissions(
    data,
    container,
    onClaim
) {
    if (!container) {
        return;
    }

    container.innerHTML = "";

    for (const m of MISSION_DEFS) {
        const completed =
            getCompletedCount(data, m);

        const goal =
            getGoal(data, m);

        const reward =
            getReward(data, m);

        const current =
            getMissionProgress(
                data,
                m,
                goal
            );

        const done =
            current >= goal;

        const claimed =
            m.oneTime && completed >= 1;

        const el =
            document.createElement("div");

        el.className = "mission";

        const title =
            m.title.replace(
                "{goal}",
                goal
            );

        const percentage =
            goal > 0
                ? Math.min(
                    100,
                    (current / goal) * 100
                )
                : 0;

        el.innerHTML = `
            <div class="mission-top">
                <span>${title}</span>
                <span>🪙 ${reward}</span>
            </div>

            <div class="bar">
                <i style="width:${percentage}%"></i>
            </div>

            <small>
                ${current} / ${goal}
            </small>
        `;

        if (m.oneTime && claimed) {
            const small =
                document.createElement("small");

            small.className =
                "mission-claimed";

            small.textContent =
                "✓ Claimed";

            el.appendChild(small);
        }

        else if (done) {
            const button =
                document.createElement("button");

            button.className =
                "mission-claim";

            button.type = "button";
            button.textContent = "CLAIM";

            button.onclick = () => {
                onClaim(m);
            };

            el.appendChild(button);
        }

        container.appendChild(el);
    }
}
