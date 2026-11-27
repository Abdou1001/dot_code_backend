/**
 * Normalizes a Yemeni phone number to the canonical international format.
 *
 * Converts local, +967, and 00967 variants to the 967-prefixed representation
 * used by authentication and persisted user phone numbers.
 *
 * @param {string} phone - Submitted Yemeni phone number.
 * @returns {string} Canonical Yemeni phone number without a plus sign.
 */
export const normalizeYemenPhone = (phone) => {
    if (typeof phone !== "string") return "";

    // 1. Remove presentation formatting before checking country prefixes.
    let normalizedPhone = phone.trim().replace(/\s+/g, "").replace(/^\+/, "");

    // 2. Convert international dialing access code to the canonical country code.
    if (normalizedPhone.startsWith("00967"))
        normalizedPhone = normalizedPhone.slice(2);

    // 3. Preserve canonical numbers and prefix local Yemeni numbers once.
    return normalizedPhone.startsWith("967")
        ? normalizedPhone
        : `967${normalizedPhone}`;
};

/**
 * Checks whether a submitted phone number represents a valid Yemeni mobile number.
 *
 * Normalizes accepted dialing formats first, allowing callers to validate the
 * same representations accepted by authentication and account creation.
 *
 * @param {string} phone - Submitted Yemeni phone number.
 * @returns {boolean} True when the normalized number has a valid Yemeni mobile format.
 */
export const isValidYemenPhone = (phone) => {
    return /^9677\d{8}$/.test(normalizeYemenPhone(phone));
};
