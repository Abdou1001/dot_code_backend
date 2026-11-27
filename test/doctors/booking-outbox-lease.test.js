import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const serviceSource = await readFile(
    new URL(
        "../../src/services/doctors/bookingNotificationOutbox.service.js",
        import.meta.url,
    ),
    "utf8",
);

test("requires the claimed lease token before completing or retrying a task", () => {
    const leaseMatches = serviceSource.match(/\.eq\("lease_token", task\.lease_token\)/g) || [];

    assert.equal(leaseMatches.length, 2);
    assert.match(serviceSource, /lease lost/);
});
