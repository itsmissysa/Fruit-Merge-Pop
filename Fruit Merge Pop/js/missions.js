// ======================================================
// MISSIONS
// ======================================================

export const MISSION_DEFS = [

    // ==================================================
    // SCORE MISSION
    // ==================================================

    {
        id: "score",
        title: "Reach {goal} points",
        type: "score",
        baseGoal: 500,
        reward: 100
    },


    // ==================================================
    // MERGE MISSION
    // ==================================================
    // ONE-TIME ONLY
    // 5 merges -> CLAIMED -> stays claimed
    // ==================================================

    {
        id: "merges",
        title: "Make {goal} merges",
        type: "merges",
        baseGoal: 5,
        reward: 50,
        oneTime: true
    },


    // ==================================================
    // RARE GOLDEN FRUIT
    // ==================================================

    {
        id: "goldenFruit",
        title: "Create a Golden Fruit",
        type: "fruit",
        goal: 19,
        reward: 250,
        oneTime: true
    }

];


// ======================================================
// GET COMPLETED COUNT
// ======================================================

function getCompletedCount(data, mission) {

    if (!data.missions) {
        return 0;
    }

    const value =
        data.missions[mission.id];


    // --------------------------------------------------
    // OLD SAVE COMPATIBILITY
    // --------------------------------------------------

    if (value === true) {
        return 1;
    }


    return Number(value) || 0;
}


// ======================================================
// GET CURRENT GOAL
// ======================================================

function getGoal(data, mission) {

    // --------------------------------------------------
    // ONE-TIME MISSION
    // --------------------------------------------------

    if (mission.oneTime) {

        return (
            mission.goal ??
            mission.baseGoal ??
            0
        );

    }


    // --------------------------------------------------
    // PROGRESSIVE MISSION
    // --------------------------------------------------

    return mission.baseGoal;
}


// ======================================================
// GET CURRENT REWARD
// ======================================================

function getReward(data, mission) {

    const completed =
        getCompletedCount(
            data,
            mission
        );


    // --------------------------------------------------
    // ONE-TIME MISSION
    // --------------------------------------------------

    if (mission.oneTime) {

        return mission.reward;

    }


    // --------------------------------------------------
    // PROGRESSIVE MISSION
    // --------------------------------------------------

    return (
        mission.reward *
        (completed + 1)
    );
}


// ======================================================
// GET CURRENT PROGRESS
// ======================================================

function getMissionProgress(
    data,
    mission,
    goal
) {

    const completed =
        getCompletedCount(
            data,
            mission
        );


    let total = 0;


    // ==================================================
    // SCORE
    // ==================================================

    if (
        mission.type === "score"
    ) {

        total =
            Number(
                data.totalScore
            ) || 0;

    }


    // ==================================================
    // MERGES
    // ==================================================

    else if (
        mission.type === "merges"
    ) {

        total =
            Number(
                data.totalMerges
            ) || 0;

    }


    // ==================================================
    // GOLDEN FRUIT
    // ==================================================

    else if (
        mission.type === "fruit"
    ) {

        /*
         * IMPORTANT:
         *
         * bestFruit represents the highest fruit level
         * reached.
         *
         * We do NOT want to display:
         *
         * bestFruit = 8
         * -> 8 / 19
         *
         * because that makes it look like the player is
         * progressing toward the Golden Fruit when they
         * have not actually created one.
         *
         * Instead:
         *
         * bestFruit < 19
         * -> 0 / 19
         *
         * bestFruit >= 19
         * -> 19 / 19
         *
         * This means the Golden Fruit mission is treated
         * as a true one-time achievement.
         */

        const bestFruit =
            Number(
                data.bestFruit
            ) || 0;


        if (
            bestFruit >= goal
        ) {

            total =
                goal;

        } else {

            total =
                0;

        }

    }


    // ==================================================
    // ONE-TIME MISSION
    // ==================================================

    if (
        mission.oneTime
    ) {

        // ------------------------------------------------
        // ALREADY CLAIMED
        // ------------------------------------------------

        if (
            completed >= 1
        ) {

            return goal;

        }


        // ------------------------------------------------
        // NOT CLAIMED YET
        // ------------------------------------------------

        return Math.min(
            total,
            goal
        );

    }


    // ==================================================
    // PROGRESSIVE MISSION
    // ==================================================

    const previousRequired =
        completed *
        goal;


    const current =
        total -
        previousRequired;


    return Math.min(
        Math.max(
            current,
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


    for (
        const m of MISSION_DEFS
    ) {

        // ==================================================
        // COMPLETED COUNT
        // ==================================================

        const completed =
            getCompletedCount(
                data,
                m
            );


        // ==================================================
        // CURRENT GOAL
        // ==================================================

        const goal =
            getGoal(
                data,
                m
            );


        // ==================================================
        // CURRENT REWARD
        // ==================================================

        const reward =
            getReward(
                data,
                m
            );


        // ==================================================
        // CURRENT PROGRESS
        // ==================================================

        const current =
            getMissionProgress(
                data,
                m,
                goal
            );


        // ==================================================
        // STATUS
        // ==================================================

        const done =
            current >= goal;


        const claimed =
            m.oneTime &&
            completed >= 1;


        // ==================================================
        // CREATE ELEMENT
        // ==================================================

        const el =
            document.createElement(
                "div"
            );


        el.className =
            "mission";


        // ==================================================
        // TITLE
        // ==================================================

        const title =
            m.title.replace(
                "{goal}",
                goal
            );


        // ==================================================
        // PROGRESS %
        // ==================================================

        const percentage =
            goal > 0
                ? Math.min(
                    100,
                    (current / goal) * 100
                )
                : 0;


        // ==================================================
        // CONTENT
        // ==================================================

        el.innerHTML = `

            <div class="mission-top">

                <span>
                    ${title}
                </span>

                <span>
                    🪙 ${reward}
                </span>

            </div>


            <div class="bar">

                <i
                    style="
                        width: ${percentage}%;
                    "
                ></i>

            </div>


            <small>
                ${current} / ${goal}
            </small>

        `;


        // ==================================================
        // ONE-TIME ALREADY CLAIMED
        // ==================================================

        if (
            m.oneTime &&
            claimed
        ) {

            const small =
                document.createElement(
                    "small"
                );


            small.className =
                "mission-claimed";


            small.textContent =
                "✓ Claimed";


            el.appendChild(
                small
            );

        }


        // ==================================================
        // READY TO CLAIM
        // ==================================================

        else if (
            done
        ) {

            const button =
                document.createElement(
                    "button"
                );


            button.className =
                "mission-claim";


            button.type =
                "button";


            button.textContent =
                "CLAIM";


            button.onclick = () => {

                // ------------------------------------------
                // PREVENT DOUBLE CLICK
                // ------------------------------------------

                if (
                    button.disabled
                ) {
                    return;
                }


                button.disabled =
                    true;


                // ------------------------------------------
                // CLAIM MISSION
                // ------------------------------------------

                onClaim({

                    ...m,

                    goal:
                        goal,

                    reward:
                        reward

                });

            };


            el.appendChild(
                button
            );

        }


        // ==================================================
        // IN PROGRESS
        // ==================================================

        else {

            const small =
                document.createElement(
                    "small"
                );


            small.className =
                "mission-status";


            small.textContent =
                "Keep going!";


            el.appendChild(
                small
            );

        }


        // ==================================================
        // ADD TO CONTAINER
        // ==================================================

        container.appendChild(
            el
        );

    }

}