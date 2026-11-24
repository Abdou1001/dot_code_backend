import assert from "node:assert/strict";
import test from "node:test";
import {
    insertAppointmentSchema,
    updateAppointmentSchema,
} from "../../src/validations/appointments.validation.js";

const appointmentPayload = {
    schedule_id: 10,
    depart_id: 3,
    patient_name: "أحمد محمد",
    patient_phone: "967777777777",
    patient_age: 30,
    patient_gender: "ذكر",
    appointment_date: "2026-11-25",
};

test("requires a valid department ID when creating an appointment", () => {
    const validResult = insertAppointmentSchema.safeParse(appointmentPayload);
    assert.equal(validResult.success, true);
    assert.equal(validResult.data.depart_id, 3);

    const missingDepartment = insertAppointmentSchema.safeParse({
        ...appointmentPayload,
        depart_id: undefined,
    });
    assert.equal(missingDepartment.success, false);
    assert.equal(
        missingDepartment.error.issues[0].message,
        "يجب تحديد القسم الطبي لإتمام الحجز.",
    );

    const invalidDepartment = insertAppointmentSchema.safeParse({
        ...appointmentPayload,
        depart_id: "3.5",
    });
    assert.equal(invalidDepartment.success, false);
});

test("validates the existing patient-editable fields on appointment updates", () => {
    const validResult = updateAppointmentSchema.safeParse({
        patient_name: "محمد أحمد",
        patient_phone: "967711111111",
        patient_age: 31,
        patient_gender: "ذكر",
        notes: "ملاحظة",
    });

    assert.equal(validResult.success, true);

    const invalidPhone = updateAppointmentSchema.safeParse({
        patient_phone: "invalid",
    });
    assert.equal(invalidPhone.success, false);
});
