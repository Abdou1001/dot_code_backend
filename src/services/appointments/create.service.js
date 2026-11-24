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
 * Creates an appointment after validating its booking window, department, and schedule.
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

        const doctor_fee = schedule.doctor.consultation_fee;
        const platform_fee = platform_fee_;

        const {data: appointment, error} = await supabase
            .from("appointment")
            .insert({
                user_id: userId,
                schedule_id,
                depart_id,
                patient_name,
                patient_phone,
                patient_age,
                patient_gender,
                notes,
                payment_receipt,
                appointment_date,
                doctor_fee,
                platform_fee,
                total_amount: doctor_fee + platform_fee,
                status: "pending",
                admin_notes: null,
                created_at: new Date(),
            })
            .select("*")
            .single();

        if (!appointment || error)
            throw new ApiError("حدث خطأ أثناء إنشاء الحجز", 400);

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
