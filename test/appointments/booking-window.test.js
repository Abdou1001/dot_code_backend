import assert from "node:assert/strict";
import test from "node:test";
import {validateAppointmentBookingWindow} from "../../src/services/appointments/bookingWindow.service.js";

const wednesdayInAden = new Date("2026-11-25T09:00:00+03:00");

const assertRejected = (appointmentDate, currentDate, message) => {
    assert.throws(
        () => validateAppointmentBookingWindow(appointmentDate, currentDate),
        (error) => error.statusCode === 400 && error.message === message,
    );
};

test("accepts dates from today through the inclusive seventh calendar day", () => {
    ["2026-11-25", "2026-11-26", "2026-12-01", "2026-12-02"].forEach(
        (appointmentDate) => {
            assert.doesNotThrow(() =>
                validateAppointmentBookingWindow(appointmentDate, wednesdayInAden),
            );
        },
    );
});

test("rejects dates before today and after the seventh calendar day", () => {
    assertRejected(
        "2026-11-24",
        wednesdayInAden,
        "لا يمكن حجز موعد بتاريخ سابق لليوم. يرجى اختيار تاريخ من اليوم وحتى 7 أيام قادمة.",
    );
    assertRejected(
        "2026-12-03",
        wednesdayInAden,
        "لا يمكن حجز موعد بعد 7 أيام من تاريخ اليوم. يرجى اختيار موعد من اليوم وحتى نفس اليوم من الأسبوع القادم.",
    );
});

test("handles month and year boundaries using Asia/Aden calendar dates", () => {
    const decemberInAden = new Date("2026-12-29T12:00:00+03:00");

    assert.doesNotThrow(() =>
        validateAppointmentBookingWindow("2027-01-05", decemberInAden),
    );
    assertRejected(
        "2027-01-06",
        decemberInAden,
        "لا يمكن حجز موعد بعد 7 أيام من تاريخ اليوم. يرجى اختيار موعد من اليوم وحتى نفس اليوم من الأسبوع القادم.",
    );
});

test("uses the Asia/Aden date near midnight and rejects malformed dates", () => {
    const adenMidnight = new Date("2026-11-24T21:00:00Z");

    assert.doesNotThrow(() =>
        validateAppointmentBookingWindow("2026-11-25", adenMidnight),
    );
    assertRejected(
        "2026-02-30",
        adenMidnight,
        "تاريخ الحجز غير صالح. يرجى إدخال تاريخ صحيح.",
    );
    assertRejected(
        "25/11/2026",
        adenMidnight,
        "تاريخ الحجز غير صالح. يرجى إدخال تاريخ صحيح.",
    );
});
