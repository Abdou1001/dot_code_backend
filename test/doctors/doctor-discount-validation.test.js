import assert from "node:assert/strict";
import test from "node:test";

process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const {insertDoctorSchema, updateDoctorSchema} = await import(
    "../../src/validations/doctors.validation.js"
);

const doctorPayload = {
    full_name: "دكتور أحمد",
    email: "",
    bio: "استشاري في الطب الباطني بخبرة واسعة في متابعة المرضى.",
    education: "بكالوريوس طب",
    gender: "ذكر",
    years_exper: 10,
    phone_number: "967777777777",
    consultation_fee: "5000",
    password: "secure-password",
    date_of_birth: "1980-01-01",
};

test("defaults an omitted Doctor discount to zero", async () => {
    const result = await insertDoctorSchema.safeParseAsync(doctorPayload);

    assert.equal(result.success, true);
    assert.equal(result.data.discount_amount, 0);
});

test("accepts a valid fixed Doctor discount", async () => {
    const result = await insertDoctorSchema.safeParseAsync({
        ...doctorPayload,
        discount_amount: "500",
    });

    assert.equal(result.success, true);
    assert.equal(result.data.discount_amount, 500);
});

test("rejects negative, excessive, and malformed Doctor discounts", async () => {
    for (const discount_amount of ["-1", "5001", "", "Infinity", "invalid"]) {
        const result = await insertDoctorSchema.safeParseAsync({
            ...doctorPayload,
            discount_amount,
        });

        assert.equal(result.success, false);
    }
});

test("allows an Admin to reset a Doctor discount to zero", () => {
    const result = updateDoctorSchema.safeParse({discount_amount: "0"});

    assert.equal(result.success, true);
    assert.equal(result.data.discount_amount, 0);
});

test("rejects an update discount greater than a submitted consultation fee", () => {
    const result = updateDoctorSchema.safeParse({
        consultation_fee: "5000",
        discount_amount: "5001",
    });

    assert.equal(result.success, false);
    assert.equal(
        result.error.issues[0].message,
        "قيمة الخصم لا يمكن أن تتجاوز سعر الاستشارة.",
    );
});
