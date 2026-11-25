import assert from "node:assert/strict";
import test from "node:test";
import {getReceptionPendingDates} from "../../src/services/appointments/receptionDate.service.js";

test("calculates today and tomorrow using the Asia/Aden calendar date", () => {
    const dates = getReceptionPendingDates(new Date("2026-11-24T21:00:00Z"));

    assert.deepEqual(dates, {
        today: "2026-11-25",
        tomorrow: "2026-11-26",
    });
});

test("handles the year boundary in the Asia/Aden timezone", () => {
    const dates = getReceptionPendingDates(new Date("2026-12-31T21:30:00Z"));

    assert.deepEqual(dates, {
        today: "2027-01-01",
        tomorrow: "2027-01-02",
    });
});
