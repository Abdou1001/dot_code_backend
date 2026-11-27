import assert from "node:assert/strict";
import test from "node:test";
import {
    applyEffectiveDoctorBookingState,
    isDoctorBookingEffectivelyOpen,
} from "../../src/services/doctors/booking.service.js";

test("treats an elapsed temporary suspension as effectively open", () => {
    const doctor = {
        is_booking_open: false,
        booking_reopen_at: "2026-12-01T21:00:00.000Z",
    };

    assert.equal(
        isDoctorBookingEffectivelyOpen(doctor, new Date("2026-12-01T21:00:01.000Z")),
        true,
    );
    assert.equal(applyEffectiveDoctorBookingState(doctor).is_booking_open, false);
});

test("keeps indefinite and unexpired suspensions closed", () => {
    assert.equal(
        isDoctorBookingEffectivelyOpen(
            {is_booking_open: false, booking_reopen_at: null},
            new Date("2026-12-01T00:00:00.000Z"),
        ),
        false,
    );
    assert.equal(
        isDoctorBookingEffectivelyOpen(
            {
                is_booking_open: false,
                booking_reopen_at: "2026-12-01T21:00:00.000Z",
            },
            new Date("2026-12-01T20:59:59.000Z"),
        ),
        false,
    );
});
