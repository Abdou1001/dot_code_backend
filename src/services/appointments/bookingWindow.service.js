import ApiError from "../../utils/ApiError.js";

const HOSPITAL_TIME_ZONE = "Asia/Aden";
const APPOINTMENT_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

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

    return Date.UTC(parts.year, parts.month - 1, parts.day);
};

/**
 * Validates that an appointment date is within the inclusive 7-day booking window.
 */
export const validateAppointmentBookingWindow = (
    appointmentDate,
    currentDate = new Date(),
) => {
    const dateMatch = APPOINTMENT_DATE_PATTERN.exec(appointmentDate);

    if (!dateMatch)
        throw new ApiError("تاريخ الحجز غير صالح. يرجى إدخال تاريخ صحيح.", 400);

    const [, year, month, day] = dateMatch.map(Number);
    const requestedDate = Date.UTC(year, month - 1, day);
    const normalizedRequestedDate = new Date(requestedDate);

    // Re-check calendar components so invalid dates such as 2026-02-30 are rejected.
    if (
        normalizedRequestedDate.getUTCFullYear() !== year ||
        normalizedRequestedDate.getUTCMonth() !== month - 1 ||
        normalizedRequestedDate.getUTCDate() !== day
    ) {
        throw new ApiError("تاريخ الحجز غير صالح. يرجى إدخال تاريخ صحيح.", 400);
    }

    // UTC values here represent calendar-day keys; local dates are first read in Asia/Aden.
    const today = getHospitalCalendarDate(currentDate);
    const lastAllowedDate = new Date(today);
    lastAllowedDate.setUTCDate(lastAllowedDate.getUTCDate() + 7);

    if (requestedDate < today) {
        throw new ApiError(
            "لا يمكن حجز موعد بتاريخ سابق لليوم. يرجى اختيار تاريخ من اليوم وحتى 7 أيام قادمة.",
            400,
        );
    }

    if (requestedDate > lastAllowedDate.getTime()) {
        throw new ApiError(
            "لا يمكن حجز موعد بعد 7 أيام من تاريخ اليوم. يرجى اختيار موعد من اليوم وحتى نفس اليوم من الأسبوع القادم.",
            400,
        );
    }
};
