import {supabase} from "../../config/supabase.js";
import {CACHE_KEYS} from "../../config/cache.js";
import {STORAGE_BUCKETS} from "../../config/storage.js";
import {deleteCache} from "../cache.service.js";
import {
    rollbackUploadedImage,
    uploadAndProcessImage,
} from "../imageUpload.service.js";
import ApiError from "../../utils/ApiError.js";
import {validateAppointmentBookingWindow} from "./bookingWindow.service.js";
import {
    getScheduleForAppointment,
    platform_fee_,
    validateAppointmentDepartment,
    validateAppointmentDetails,
} from "./appointment.helpers.js";

/**
 * Creates an appointment through the database booking-lock transaction.
 *
 * Locks the Doctor resolved from the schedule so a newly created appointment
 * cannot race a Doctor booking suspension.
 *
 * @param {object} appointmentData - Fully validated appointment fields.
 * @returns {Promise<object>} Created appointment record.
 * @throws {ApiError} When booking is currently suspended or insertion fails.
 */
const createAppointmentWithBookingLock = async (appointmentData) => {
    const {data, error} = await supabase.rpc(
        "create_appointment_with_booking_lock",
        {p_appointment: appointmentData},
    );

    if (error?.message?.includes("DOCTOR_BOOKING_CLOSED")) {
        throw new ApiError("حجوزات هذا الطبيب متوقفة حاليًا.", 400);
    }

    if (error?.message?.includes("APPOINTMENT_CAPACITY_REACHED")) {
        throw new ApiError("تم الوصول إلى الحد الأقصى للحجوزات لهذا الدوام", 400);
    }

    if (error?.message?.includes("APPOINTMENT_SCHEDULE_UNAVAILABLE")) {
        throw new ApiError("هذا الدوام غير متاح حالياً", 400);
    }

    if (error?.message?.includes("APPOINTMENT_DOCTOR_UNAVAILABLE")) {
        throw new ApiError("الطبيب لا يستقبل الحجوزات حالياً", 400);
    }

    if (error?.message?.includes("APPOINTMENT_DEPARTMENT_INVALID")) {
        throw new ApiError("القسم الطبي المحدد غير متاح للحجز حاليًا.", 400);
    }

    if (error) throw new ApiError("حدث خطأ أثناء إنشاء الحجز", 400);

    return Array.isArray(data) ? data[0] : data;
};

/**
 * Creates an appointment after validating its booking window, department, and schedule.
 *
 * Performs the final availability check and insert through a locked PostgreSQL
 * transaction after image processing, preserving the existing rollback behavior.
 *
 * @param {object} payload - Appointment request data and authenticated user context.
 * @param {object} payload.body - Validated appointment body.
 * @param {number} payload.userId - Authenticated patient user ID.
 * @param {object|undefined} payload.file - Optional payment receipt upload.
 * @returns {Promise<object>} Created appointment.
 */
export const createAppointmentForUser = async ({body, userId, file}) => {
    const {
        schedule_id,
        depart_id,
        patient_name,
        patient_phone,
        patient_age,
        patient_gender,
        notes,
        appointment_date,
    } = body;
    let payment_receipt = null;

    try {
        validateAppointmentBookingWindow(appointment_date);

        const schedule = await getScheduleForAppointment(schedule_id);

        await validateAppointmentDepartment({depart_id, schedule});

        await validateAppointmentDetails({
            schedule,
            schedule_id,
            patient_name,
            patient_phone,
            appointment_date,
        });

        payment_receipt = await uploadAndProcessImage(
            STORAGE_BUCKETS.PAYMENT_RECEIPTS,
            file,
        );

        const platform_fee = platform_fee_;

        const appointment = await createAppointmentWithBookingLock({
            user_id: userId,
            schedule_id,
            depart_id,
            patient_name,
            patient_phone,
            patient_age,
            patient_gender,
            notes: notes || null,
            payment_receipt,
            appointment_date,
            platform_fee,
        });

        const appointmentYear = appointment_date
            ? new Date(appointment_date).getFullYear()
            : new Date().getFullYear();
        const currentYear = new Date().getFullYear();

        await deleteCache(
            `${CACHE_KEYS.APPOINTMENTS_CHART}:${appointmentYear}`,
        );

        if (appointmentYear !== currentYear)
            await deleteCache(
                `${CACHE_KEYS.APPOINTMENTS_CHART}:${currentYear}`,
            );

        await deleteCache(CACHE_KEYS.DASHBOARD);

        return appointment;
    } catch (error) {
        await rollbackUploadedImage(
            STORAGE_BUCKETS.PAYMENT_RECEIPTS,
            payment_receipt,
        );
        throw error;
    }
};
