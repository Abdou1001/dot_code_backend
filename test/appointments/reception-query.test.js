import assert from "node:assert/strict";
import test from "node:test";

test("applies Reception department filters without awaiting a query builder", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

    const {restrictAppointmentsForReception} = await import(
        "../../src/services/appointments/receptionAuthorization.service.js"
    );
    const calls = [];
    const query = {
        in(column, values) {
            calls.push({column, values});
            return this;
        },
    };

    assert.equal(restrictAppointmentsForReception(query, [2, 3]), query);
    assert.deepEqual(calls, [{column: "depart_id", values: [2, 3]}]);

    assert.equal(restrictAppointmentsForReception(query, []), query);
    assert.deepEqual(calls[1], {column: "depart_id", values: [-1]});

    assert.equal(restrictAppointmentsForReception(query, null), query);
    assert.equal(calls.length, 2);
});
