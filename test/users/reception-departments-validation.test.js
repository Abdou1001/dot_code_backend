import assert from "node:assert/strict";
import test from "node:test";
import {updateReceptionDepartmentsSchema} from "../../src/validations/users.validation.js";

test("accepts an empty or unique positive Reception department assignment list", () => {
    assert.equal(
        updateReceptionDepartmentsSchema.safeParse({depart_ids: []}).success,
        true,
    );
    assert.equal(
        updateReceptionDepartmentsSchema.safeParse({depart_ids: [2, "3"]})
            .success,
        true,
    );
});

test("rejects duplicate and invalid Reception department IDs", () => {
    const duplicateDepartments = updateReceptionDepartmentsSchema.safeParse({
        depart_ids: [2, 2],
    });
    assert.equal(duplicateDepartments.success, false);
    assert.equal(
        duplicateDepartments.error.issues[0].message,
        "لا يمكن تكرار الأقسام المحددة.",
    );

    assert.equal(
        updateReceptionDepartmentsSchema.safeParse({depart_ids: [0]}).success,
        false,
    );
    assert.equal(
        updateReceptionDepartmentsSchema.safeParse({depart_ids: [1.5]}).success,
        false,
    );
});
