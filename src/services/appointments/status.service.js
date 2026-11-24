import {supabase} from "../../config/supabase.js";
import {sendNotificationToUser} from "../notification.service.js";
import ApiError from "../../utils/ApiError.js";
import {
    formatAppointment,
    invalidateAppointmentCache,
    selectStatment,
} from "./appointment.helpers.js";

export const changeAppointmentStatus = async ({id, status, admin_notes}) => {
    const allowedStatuses = ["pending", "approved", "rejected", "cancelled"];

    if (!allowedStatuses.includes(status))
        throw new ApiError("حالة الحجز غير صحيحة", 400);

    const {data: appointment, error} = await supabase
        .from("appointment")
        .select(selectStatment)
        .eq("appointment_id", id)
        .single();

    if (!appointment || error) throw new ApiError("الحجز غير موجود", 404);
    if (appointment.status === "cancelled")
        throw new ApiError("لا يمكن تعديل حالة حجز ملغي", 400);
    if (appointment.status === status)
        throw new ApiError("الحجز بهذه الحالة بالفعل", 400);

    if (status === "approved") {
        const {data: schedule, error: scheduleError} = await supabase
            .from("doctor_schedule")
            .select("schedule_id,max_patients,status")
            .eq("schedule_id", appointment.schedule_id)
            .single();

        if (!schedule || scheduleError)
            throw new ApiError("الدوام غير موجود", 404);

        if (schedule.status !== "active")
            throw new ApiError("هذا الدوام غير متاح حالياً", 400);

        const {count, error: countError} = await supabase
            .from("appointment")
            .select("*", {count: "exact", head: true})
            .eq("schedule_id", appointment.schedule_id)
            .eq("appointment_date", appointment.appointment_date)
            .eq("status", "approved");

        if (countError)
            throw new ApiError("حدث خطأ أثناء التحقق من عدد الحجوزات", 500);

        if (count >= schedule.max_patients)
            throw new ApiError(
                "تم الوصول إلى الحد الأقصى للحجوزات لهذا الدوام",
                400,
            );
    }

    const {data: changedAppointment, error: changeError} = await supabase
        .from("appointment")
        .update({status, admin_notes})
        .eq("appointment_id", id)
        .select(selectStatment)
        .single();

    if (!changedAppointment || changeError)
        throw new ApiError("حدث خطأ أثناء تحديث حالة الحجز", 400);

    await invalidateAppointmentCache(
        changedAppointment?.appointment_date || appointment?.appointment_date,
    );

    try {
        await sendNotificationToUser({
            userId: changedAppointment.user_id,
            title:
                status === "approved"
                    ? "تم قبول حجزك مع الطبيب"
                    : status === "rejected"
                      ? "تم رفض حجزك"
                      : status === "cancelled"
                        ? "تم إلغاء حجزك"
                        : "تم تحديث حالة حجزك",
            message:
                status === "approved"
                    ? "تم تأكيد موعدك مع الطبيب، احضر سند الدفع لتأكيد الدفع عند الاستقبال"
                    : status === "rejected"
                      ? "نعتذر، تم رفض حجزك. يرجى مراجعة تفاصيل الموعد، وحافظ على سند الدفع حتى تستطيع إعادة الحجز أو الحضور لاسترجاع المبلغ"
                      : status === "cancelled"
                        ? "تم إلغاء موعدك، يرجى مراجعة تفاصيل الحجز"
                        : "تم تحديث حالة حجزك",
            type: "appointment",
            data: {
                appointment_id: changedAppointment.appointment_id,
                status,
            },
        });
    } catch (error) {
        console.error("هناك مشكلة في ارسال الاشعارات:", error);
    }

    await formatAppointment(changedAppointment);

    return changedAppointment;
};

export const cancelUserAppointment = async ({id, userId}) => {
    const {data: appointment, error} = await supabase
        .from("appointment")
        .select(selectStatment)
        .eq("appointment_id", id)
        .eq("user_id", userId)
        .single();

    if (!appointment || error) throw new ApiError("الحجز غير موجود", 404);

    if (
        appointment.status === "approved" ||
        appointment.status === "rejected"
    ) {
        throw new ApiError("لا يمكن تعديل الحجز بعد مراجعته", 400);
    }

    if (appointment.status === "cancelled")
        throw new ApiError("تم إلغاء الحجز مسبقاً", 400);

    const {data: cancelledAppointment, error: cancelError} = await supabase
        .from("appointment")
        .update({status: "cancelled"})
        .eq("appointment_id", id)
        .select(selectStatment)
        .single();

    if (!cancelledAppointment || cancelError)
        throw new ApiError("حدث خطأ أثناء إلغاء الحجز", 400);

    await invalidateAppointmentCache(
        cancelledAppointment?.appointment_date || appointment?.appointment_date,
    );

    return cancelledAppointment;
};
