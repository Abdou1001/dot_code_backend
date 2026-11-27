import assert from "node:assert/strict";
import test from "node:test";
import {isValidYemenPhone, normalizeYemenPhone} from "../../src/utils/phone.js";

test("normalizes supported Yemeni mobile formats to one canonical number", () => {
    [
        "777654321",
        "+967777654321",
        "00967777654321",
        "967777654321",
    ].forEach((phoneNumber) => {
        assert.equal(normalizeYemenPhone(phoneNumber), "967777654321");
    });
});

test("rejects malformed Yemeni mobile numbers after normalization", () => {
    assert.equal(isValidYemenPhone("123456789"), false);
    assert.equal(isValidYemenPhone("96777765432"), false);
    assert.equal(isValidYemenPhone("9677776543210"), false);
});
