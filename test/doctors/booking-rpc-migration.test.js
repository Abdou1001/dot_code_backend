import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
    new URL(
        "../../supabase/migrations/20261127000000_doctor_booking_suspension_and_notification_outbox.sql",
        import.meta.url,
    ),
    "utf8",
);

test("uses matching Doctor row locks for booking toggle and appointment creation", () => {
    assert.match(migration, /FUNCTION public\.toggle_doctor_booking/);
    assert.match(migration, /FUNCTION public\.create_appointment_with_booking_lock/);
    assert.match(migration, /FOR UPDATE OF doctor/g);
    assert.match(migration, /DOCTOR_BOOKING_CLOSED/);
});

test("queues one protected push and SMS task per cancelled appointment", () => {
    assert.match(migration, /doctor_booking_notification_outbox/);
    assert.match(migration, /CROSS JOIN \(VALUES \('push'::text\), \('sms'::text\)\)/);
    assert.match(migration, /UNIQUE \(appointment_id, channel\)/);
    assert.match(migration, /FOR UPDATE SKIP LOCKED/);
});

test("counts updated appointments directly and binds task updates to a lease", () => {
    assert.match(migration, /\(SELECT count\(\*\) FROM cancelled\)/);
    assert.doesNotMatch(migration, /v_cancelled_count := v_queued_count \/ 2/);
    assert.match(migration, /lease_token text/);
    assert.match(migration, /lease_token = md5/);
});
