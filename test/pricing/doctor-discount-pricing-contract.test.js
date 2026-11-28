import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const [appointmentCreation, bookingMigration, doctorManagement] = await Promise.all([
    readFile(
        new URL(
            "../../src/services/appointments/create.service.js",
            import.meta.url,
        ),
        "utf8",
    ),
    readFile(
        new URL(
            "../../supabase/migrations/20261127000000_doctor_booking_suspension_and_notification_outbox.sql",
            import.meta.url,
        ),
        "utf8",
    ),
    readFile(
        new URL(
            "../../src/services/doctors/management.service.js",
            import.meta.url,
        ),
        "utf8",
    ),
]);

test("does not pass client pricing into appointment creation", () => {
    assert.doesNotMatch(appointmentCreation, /platform_fee/);
    assert.doesNotMatch(appointmentCreation, /discount_amount/);
    assert.doesNotMatch(appointmentCreation, /doctor_fee/);
});

test("captures Doctor discount snapshots in the transactional appointment RPC", () => {
    assert.match(bookingMigration, /doctor\.discount_amount/);
    assert.match(bookingMigration, /doctor_fee - v_discount_amount/);
    assert.doesNotMatch(bookingMigration, /platform_fee/);
});

test("passes an explicitly configured Doctor discount through account RPC payloads", () => {
    assert.match(doctorManagement, /doctor\.discount_amount = Number\(doctorData\.discount_amount\)/);
    assert.match(doctorManagement, /validateDoctorPricing\(doctorData, currentDoctor\)/);
});
