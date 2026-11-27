import assert from "node:assert/strict";
import test from "node:test";

process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const {toggleDoctorBookingSchema} = await import(
    "../../src/validations/doctors.validation.js"
);

test("accepts an empty indefinite closure request and a valid calendar date", () => {
    assert.equal(toggleDoctorBookingSchema.safeParse({}).success, true);
    assert.equal(
        toggleDoctorBookingSchema.safeParse({
            booking_reopen_date: "2026-12-01",
        }).success,
        true,
    );
});

test("rejects malformed calendar dates and unsupported booking fields", () => {
    assert.equal(
        toggleDoctorBookingSchema.safeParse({
            booking_reopen_date: "2026-02-30",
        }).success,
        false,
    );
    assert.equal(
        toggleDoctorBookingSchema.safeParse({doctor_id: 99}).success,
        false,
    );
});

test("rejects a booking suspension date in the past", () => {
    const result = toggleDoctorBookingSchema.safeParse({
        booking_reopen_date: "2020-01-01",
    });

    assert.equal(result.success, false);
    assert.equal(
        result.error.issues[0].message,
        "تاريخ إعادة فتح الحجوزات لا يمكن أن يكون في الماضي.",
    );
});
