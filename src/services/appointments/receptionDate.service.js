const HOSPITAL_TIME_ZONE = "Asia/Aden";

const getHospitalCalendarDate = (date) => {
    const dateParts = new Intl.DateTimeFormat("en-US", {
        timeZone: HOSPITAL_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const parts = Object.fromEntries(
        dateParts
            .filter(({type}) => type !== "literal")
            .map(({type, value}) => [type, Number(value)]),
    );

    return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
        parts.day,
    ).padStart(2, "0")}`;
};

/**
 * Returns the current and next calendar dates in the hospital timezone.
 */
export const getReceptionPendingDates = (currentDate = new Date()) => {
    const today = getHospitalCalendarDate(currentDate);
    const tomorrowDate = new Date(`${today}T00:00:00Z`);
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);

    return {
        today,
        tomorrow: tomorrowDate.toISOString().split("T")[0],
    };
};
