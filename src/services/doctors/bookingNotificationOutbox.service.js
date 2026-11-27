import {supabase} from "../../config/supabase.js";
import {sendPushNotificationToUser} from "../notification.service.js";
import {sendSMS} from "../whatsapp.service.js";

const CANCELLATION_TITLE = "تم إلغاء موعدك الطبي";
const CANCELLATION_PUSH_MESSAGE =
    "نعتذر، تم إلغاء موعدك مع الطبيب بسبب تعذر حضوره. يمكنك حجز موعد آخر لاحقًا.";
const CANCELLATION_SMS_MESSAGE =
    "نعتذر، تم إلغاء موعدك مع الطبيب بسبب تعذر حضوره. يرجى الدخول إلى التطبيق لحجز موعد آخر.";

/**
 * Claims a bounded group of durable Doctor-booking notification tasks.
 *
 * The database RPC uses row locks and lease expiry so multiple workers can run
 * without delivering the same queued task concurrently.
 *
 * @param {number} [limit] - Maximum task count to claim.
 * @returns {Promise<Array<object>>} Claimed notification tasks.
 */
const claimBookingNotificationTasks = async (limit = 50) => {
    const {data, error} = await supabase.rpc(
        "claim_doctor_booking_notification_tasks",
        {p_limit: limit},
    );

    if (error) throw new Error(`Failed to claim booking notifications: ${error.message}`);

    return (data || []).map((task) => {
        const {_lease_token: leaseToken, ...notificationData} =
            task.notification_data || {};

        return {
            ...task,
            lease_token: leaseToken,
            notification_data: notificationData,
        };
    });
};

/**
 * Marks one durable delivery task as completed after its external send succeeds.
 *
 * @param {object} task - Claimed task whose lease must still be owned.
 * @returns {Promise<void>}
 */
const markBookingNotificationTaskSent = async (task) => {
    const {data, error} = await supabase
        .from("doctor_booking_notification_outbox")
        .update({
            status: "sent",
            sent_at: new Date(),
            last_error: null,
            locked_at: null,
            lease_token: null,
        })
        .eq("outbox_id", task.outbox_id)
        .eq("status", "processing")
        .eq("lease_token", task.lease_token)
        .select("outbox_id")
        .maybeSingle();

    if (error || !data)
        throw new Error(
            `Failed to mark notification sent: ${error?.message || "lease lost"}`,
        );
};

/**
 * Releases a failed task for a later retry without losing its cancellation event.
 *
 * @param {object} task - Claimed task whose lease must still be owned.
 * @param {Error} error - Delivery failure.
 * @returns {Promise<void>}
 */
const rescheduleBookingNotificationTask = async (task, error) => {
    const delayMinutes = Math.min(
        60,
        Math.max(1, 2 ** Math.min(task.attempts, 6)),
    );
    const availableAt = new Date(Date.now() + delayMinutes * 60 * 1000);

    const {data, error: updateError} = await supabase
        .from("doctor_booking_notification_outbox")
        .update({
            status: "pending",
            available_at: availableAt,
            last_error: error.message.slice(0, 500),
            locked_at: null,
            lease_token: null,
        })
        .eq("outbox_id", task.outbox_id)
        .eq("status", "processing")
        .eq("lease_token", task.lease_token)
        .select("outbox_id")
        .maybeSingle();

    if (updateError || !data) {
        throw new Error(
            `Failed to reschedule notification: ${updateError?.message || "lease lost"}`,
        );
    }
};

/**
 * Delivers a claimed Doctor-booking cancellation notification task.
 *
 * @param {object} task - Claimed task returned by PostgreSQL.
 * @returns {Promise<void>}
 */
const deliverBookingNotificationTask = async (task) => {
    if (task.channel === "push") {
        await sendPushNotificationToUser({
            userId: task.user_id,
            title: CANCELLATION_TITLE,
            message: CANCELLATION_PUSH_MESSAGE,
            data: task.notification_data || {
                appointment_id: task.appointment_id,
                doctor_id: task.doctor_id,
                type: "appointment_cancelled",
                screen: "/appointments/my-appointments",
            },
        });
        return;
    }

    if (task.channel === "sms") {
        if (!task.phone_number) {
            throw new Error("Patient phone number is unavailable for SMS delivery.");
        }
        await sendSMS(task.phone_number, CANCELLATION_SMS_MESSAGE);
        return;
    }

    throw new Error(`Unsupported booking notification channel: ${task.channel}`);
};

/**
 * Processes queued cancellation notifications after the booking transaction commits.
 *
 * External failures only reschedule their own task; they never roll back the
 * Doctor state or appointments that were already committed by PostgreSQL.
 *
 * @param {number} [limit] - Maximum task count to process in one run.
 * @returns {Promise<{claimed: number, sent: number, failed: number}>} Delivery summary.
 */
export const processDoctorBookingNotificationOutbox = async (limit = 50) => {
    const tasks = await claimBookingNotificationTasks(limit);
    let sent = 0;
    let failed = 0;

    for (const task of tasks) {
        try {
            // 1. Deliver only after PostgreSQL marked this task as processing.
            await deliverBookingNotificationTask(task);
            // 2. Persist success so future workers do not send it again.
            await markBookingNotificationTaskSent(task);
            sent++;
        } catch (error) {
            // 3. Keep the durable task for exponential-backoff retry.
            await rescheduleBookingNotificationTask(task, error);
            failed++;
        }
    }

    return {claimed: tasks.length, sent, failed};
};
