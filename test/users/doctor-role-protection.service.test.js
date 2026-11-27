import assert from "node:assert/strict";
import test from "node:test";

process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const {supabase} = await import("../../src/config/supabase.js");
const {changeUserRole} = await import(
    "../../src/services/users/management.service.js"
);

test("maps the protected Doctor role RPC error to HTTP 403", async () => {
    const originalRpc = supabase.rpc;

    supabase.rpc = async () => ({
        error: {message: "DOCTOR_ROLE_PROTECTED"},
    });

    try {
        await assert.rejects(
            () => changeUserRole(7, "user", 1),
            (error) =>
                error.statusCode === 403 &&
                error.message ===
                    "لا يمكن تغيير صلاحية الطبيب أو تحويل أي مستخدم إلى طبيب من إدارة المستخدمين.",
        );
    } finally {
        supabase.rpc = originalRpc;
    }
});

test("preserves the Admin self-role-change restriction before the RPC", async () => {
    await assert.rejects(
        () => changeUserRole(7, "reception", 7),
        (error) => error.statusCode === 400 && error.message === "لا يمكنك تغيير صلاحيتك",
    );
});
