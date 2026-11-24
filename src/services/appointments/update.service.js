import {supabase} from "../../config/supabase.js";
import {CACHE_KEYS} from "../../config/cache.js";
import {STORAGE_BUCKETS} from "../../config/storage.js";
import {deleteCache} from "../cache.service.js";
import {replaceImage} from "../imageUpload.service.js";
import ApiError from "../../utils/ApiError.js";
import {
    formatAppointment,
    getScheduleForAppointment,
    platform_fee_,
    selectStatment,
    validateAppointmentDetails,
} from "./appointment.helpers.js";

export const updateUserAppointment = async ({id, userId, body, file}) => {
    const {
        schedule_id,
        patient_name,
        patient_phone,
        patient_age,
        patient_gender,
        notes,
        appointment_date,
    } = body;

    const {data: currentAppointment, error: currentError} = await supabase
        .from("appointment")
        .select("*")
        .eq("appointment_id", id)
        .eq("user_id", userId)
        .single();

    if (!currentAppointment || currentError)
        throw new ApiError("الحجز غير موجود", 404);

    if (currentAppointment.status !== "pending")
        throw new ApiError("لا يمكن تعديل الحجز بعد مراجعته", 400);

    const appointment = await replaceImage({
        bucket: STORAGE_BUCKETS.PAYMENT_RECEIPTS,
        currentImage: currentAppointment.payment_receipt,
        file,
        action: async (payment_receipt) => {
            const schedule = await getScheduleForAppointment(schedule_id);

            await validateAppointmentDetails({
                schedule,
                schedule_id,
                patient_name,
                patient_phone,
                appointment_date,
                appointmentId: id,
            });

            const doctor_fee = schedule.doctor.consultation_fee;
            const platform_fee = platform_fee_;

            const {data, error} = await supabase
                .from("appointment")
                .update({
                    doctor_id: schedule.doctor.doctor_id,
                    schedule_id,
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
                })
                .eq("appointment_id", id)
                .select(selectStatment)
                .single();

            if (!data || error)
                throw new ApiError("حدث خطأ أثناء تعديل الحجز", 400);

            return data;
        },
    });

    const oldYear = currentAppointment.appointment_date
        ? new Date(currentAppointment.appointment_date).getFullYear()
        : null;
    const newYear = appointment_date
        ? new Date(appointment_date).getFullYear()
        : oldYear;

    if (oldYear)
        await deleteCache(`${CACHE_KEYS.APPOINTMENTS_CHART}:${oldYear}`);

    if (newYear && newYear !== oldYear)
        await deleteCache(`${CACHE_KEYS.APPOINTMENTS_CHART}:${newYear}`);

    await deleteCache(CACHE_KEYS.DASHBOARD);
    await formatAppointment(appointment);

    return appointment;
};
