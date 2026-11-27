import assert from "node:assert/strict";
import test from "node:test";

const doctorPayload = {
    full_name: "دكتور أحمد",
    email: "",
    bio: "استشاري في الطب الباطني بخبرة واسعة في متابعة المرضى.",
    education: "بكالوريوس طب",
    gender: "ذكر",
    years_exper: 10,
    phone_number: "967777777777",
    consultation_fee: 5000,
    password: "secure-password",
    date_of_birth: "1980-01-01",
    department_ids: "[1,2]",
    schedules: "[]",
};

const loadSchemas = async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

    return import("../../src/validations/doctors.validation.js");
};

test("requires password and date of birth when creating a doctor account", async () => {
    const {insertDoctorSchema} = await loadSchemas();
    const validResult = await insertDoctorSchema.safeParseAsync(doctorPayload);
    assert.equal(validResult.success, true);

    const missingPassword = await insertDoctorSchema.safeParseAsync({
        ...doctorPayload,
        password: undefined,
    });
    assert.equal(missingPassword.success, false);

    const missingDateOfBirth = await insertDoctorSchema.safeParseAsync({
        ...doctorPayload,
        date_of_birth: undefined,
    });
    assert.equal(missingDateOfBirth.success, false);
});

test("rejects protected account fields on doctor updates", async () => {
    const {updateDoctorSchema} = await loadSchemas();
    const result = updateDoctorSchema.safeParse({
        full_name: "دكتور أحمد",
        bio: doctorPayload.bio,
        gender: "ذكر",
        consultation_fee: 5000,
        password: "not-allowed",
    });

    assert.equal(result.success, false);
    assert.equal(
        result.error.issues[0].message,
        "لا يمكن تعديل بيانات حساب الطبيب المحمية من خلال هذا المسار.",
    );
});

test("rejects malformed doctor phone numbers", async () => {
    const {insertDoctorSchema} = await loadSchemas();
    const result = await insertDoctorSchema.safeParseAsync({
        ...doctorPayload,
        phone_number: "123456789",
    });

    assert.equal(result.success, false);
    assert.equal(result.error.issues[0].message, "رقم الهاتف اليمني غير صالح");
});
