import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

test("does not register obsolete Doctor account linking routes", async () => {
    const routeSource = await readFile(
        new URL("../../src/routes/doctors.route.js", import.meta.url),
        "utf8",
    );

    assert.doesNotMatch(routeSource, /\/:id\/account/);
});
