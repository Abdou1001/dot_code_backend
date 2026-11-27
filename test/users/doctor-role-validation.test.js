import assert from "node:assert/strict";
import test from "node:test";
import {changeUserRoleSchema} from "../../src/validations/users.validation.js";

test("rejects the doctor role in generic user role changes", () => {
    const result = changeUserRoleSchema.safeParse({role: "doctor"});

    assert.equal(result.success, false);
    assert.equal(
        result.error.issues[0].message,
        "لا يمكن تغيير صلاحية الطبيب أو تحويل أي مستخدم إلى طبيب من إدارة المستخدمين.",
    );
});

test("continues accepting user, admin, and reception role changes", () => {
    for (const role of ["user", "admin", "reception"]) {
        assert.equal(changeUserRoleSchema.safeParse({role}).success, true);
    }
});

test("continues rejecting unknown user roles", () => {
    assert.equal(
        changeUserRoleSchema.safeParse({role: "unknown"}).success,
        false,
    );
});
