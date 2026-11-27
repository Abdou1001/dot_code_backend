import cron from "node-cron";
import {processDoctorBookingNotificationOutbox} from "../services/doctors/bookingNotificationOutbox.service.js";

/**
 * Starts recurring processing for Doctor-booking cancellation notification tasks.
 *
 * The database outbox remains the source of truth, so a missed cron run only
 * delays delivery and does not lose a committed cancellation notification.
 *
 * @returns {void}
 */
export const startDoctorBookingNotificationJob = () => {
    cron.schedule(
        "* * * * *",
        async () => {
            try {
                const result = await processDoctorBookingNotificationOutbox();

                if (result.claimed > 0) {
                    console.log(
                        `[Doctor Booking Notifications] Sent ${result.sent}, retrying ${result.failed}.`,
                    );
                }
            } catch (error) {
                console.error(
                    "[Doctor Booking Notifications] Failed:",
                    error.message,
                );
            }
        },
        {timezone: "Asia/Aden"},
    );
};
