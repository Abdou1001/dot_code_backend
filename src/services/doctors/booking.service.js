/**
 * Determines whether a Doctor is effectively available for new bookings.
 *
 * A temporary suspension expires automatically when its stored reopening
 * instant has elapsed, even before a background synchronization runs.
 *
 * @param {object} doctor - Doctor booking fields.
 * @param {boolean} doctor.is_booking_open - Persisted booking state.
 * @param {string|null} doctor.booking_reopen_at - Temporary reopening instant.
 * @param {Date} [currentDate] - Current instant, injectable for deterministic tests.
 * @returns {boolean} True when the Doctor can receive new bookings.
 */
export const isDoctorBookingEffectivelyOpen = (doctor, currentDate = new Date()) => {
    if (doctor.is_booking_open) return true;
    if (!doctor.booking_reopen_at) return false;

    return new Date(doctor.booking_reopen_at).getTime() <= currentDate.getTime();
};

/**
 * Applies the effective booking state to a Doctor response object.
 *
 * Keeps list, detail, and self-profile responses consistent by hiding an
 * already elapsed reopening instant from records that are effectively open.
 *
 * @param {object} doctor - Doctor response record.
 * @returns {object} The same response record with effective booking status.
 */
export const applyEffectiveDoctorBookingState = (doctor) => {
    if (!doctor) return doctor;

    doctor.is_booking_open = isDoctorBookingEffectivelyOpen(doctor);

    if (doctor.is_booking_open) doctor.booking_reopen_at = null;

    return doctor;
};
