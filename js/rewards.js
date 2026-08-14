export function dailyInfo(data) {

    const now = new Date();

    const today =
        now.toISOString().slice(0, 10);

    const rewards = [
        20,
        30,
        50,
        75,
        100,
        150,
        500
    ];


    // Current day is stored as 0–6 internally.
    // If it reaches 7, start a new cycle at Day 1.

    let dailyDay =
        Number(data.dailyDay) || 0;

    if (dailyDay >= 7) {

        dailyDay = 0;

    }


    return {

        today,

        amount:
            rewards[dailyDay],

        day:
            dailyDay + 1,

        claimed:
            data.lastDaily === today

    };

}


export function claimDaily(data) {

    const info =
        dailyInfo(data);


    // Already claimed today
    if (info.claimed) {

        return 0;

    }


    // Give today's reward
    data.coins =
        (data.coins || 0) +
        info.amount;


    // Save today's date
    data.lastDaily =
        info.today;


    // Move to the next day
    // After Day 7, this becomes 0,
    // which means the next cycle starts at Day 1.

    data.dailyDay =
        info.day >= 7
            ? 0
            : info.day;


    return info.amount;

}