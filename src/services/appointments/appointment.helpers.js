import {supabase} from "../../config/supabase.js";
import {CACHE_KEYS} from "../../config/cache.js";
import {STORAGE_BUCKETS} from "../../config/storage.js";
import {deleteCache} from "../cache.service.js";
import {
    createSignedImageUrl,
    getPublicImageUrl,
} from "../storage.service.js";
import ApiError from "../../utils/ApiError.js";
import normalizeArabicDay from "../../utils/normalizeArabicDay.js";

export const platform_fee_ = Number(process.env.PLATFORM_FEE);
export const selectStatment = `
    *,
    doctor_schedule (
        schedule_id,
        doctor_id,
        doctor (
            doctor_id,
            full_name,
            path_image
        )
    )
`;

export const formatAppointment = async (appointment) => {
    if (appointment.doctor_schedule?.doctor?.path_image) {
        appointment.doctor_schedule.doctor.path_image = getPublicImageUrl(
            STORAGE_BUCKETS.DOCTORS,
            appointment.doctor_schedule.doctor.path_image,
        );
    }

    if (appointment.payment_receipt) {
        try {
            appointment.payment_receipt = await createSignedImageUrl(
                STORAGE_BUCKETS.PAYMENT_RECEIPTS,
                appointment.payment_receipt,
            );
        } catch {
            appointment.payment_receipt = null;
        }
    }
};

export const formatAppointments = async (appointments) =>
    Promise.all(appointments.map(formatAppointment));

export const invalidateAppointmentCache = async (appointmentDate) => {
    const appointmentYear = appointmentDate
        ? new Date(appointmentDate).getFullYear()
        : new Date().getFullYear();

    await deleteCache(`${CACHE_KEYS.APPOINTMENTS_CHART}:${appointmentYear}`);
    await deleteCache(CACHE_KEYS.DASHBOARD);
};

export const getScheduleForAppointment = async (schedule_id) => {
    const {data: schedule, error: scheduleError} = await supabase
        .from("doctor_schedule")
        .select(`*,doctor (doctor_id,full_name,consultation_fee,status,is_hidden)`)
        .eq("schedule_id", schedule_id)
        .single();

    if (!schedule || scheduleError) throw new ApiError("الدوام غير موجود", 404);
    if (schedule.status != "active") throw new ApiError("هذا الدوام غير متاح حالياً", 400);
    if (schedule.doctor.is_hidden) throw new ApiError("الطبيب غير متاح للحجز", 400);
    if (schedule.doctor.status !== "active") throw new ApiError("الطبيب لا يستقبل الحجوزات حالياً", 400);

    return schedule;
};

/**
 * Validates that a department is available and assigned to the schedule's doctor.
 */
export const validateAppointmentDepartment = async ({depart_id, schedule}) => {
    const {data: department, error: departmentError} = await supabase
        .from("department")
        .select("*")
        .eq("depart_id", depart_id)
        .single();

    if (!department || departmentError)
        throw new ApiError("القسم الطبي المحدد غير موجود.", 404);

    // Some deployments use status while others use is_active for department availability.
    if (
        ("status" in department && department.status !== "active") ||
        department.is_active === false
    ) {
        throw new ApiError("القسم الطبي المحدد غير متاح للحجز حاليًا.", 400);
    }

    if (!schedule.doctor || schedule.doctor_id !== schedule.doctor.doctor_id) {
        throw new ApiError(
            "جدول دوام الطبيب غير متوافق مع القسم الطبي المحدد.",
            400,
        );
    }

    const {data: doctorDepartment, error: doctorDepartmentError} = await supabase
        .from("doctor_department")
        .select("doctor_deprtment_id")
        .eq("doctor_id", schedule.doctor_id)
        .eq("depart_id", depart_id)
        .maybeSingle();

    if (doctorDepartmentError)
        throw new ApiError("حدث خطأ أثناء التحقق من القسم الطبي.", 500);

    if (!doctorDepartment)
        throw new ApiError(
            "الطبيب المحدد غير مرتبط بالقسم الطبي المختار.",
            400,
        );
};

export const validateAppointmentDetails = async ({
    schedule,
    schedule_id,
    patient_name,
    patient_phone,
    appointment_date,
    appointmentId,
}) => {
    const appointmentDay = new Date(appointment_date).toLocaleDateString(
        "ar-SA",
        {weekday: "long", timeZone: "UTC"},
    );

    if (
        normalizeArabicDay(appointmentDay) !==
        normalizeArabicDay(schedule.day_of_week)
    ) {
        throw new ApiError("الطبيب لا يداوم في هذا اليوم", 400);
    }

    let duplicateQuery = supabase
        .from("appointment")
        .select("appointment_id")
        .eq("schedule_id", schedule_id)
        .eq("appointment_date", appointment_date)
        .eq("patient_phone", patient_phone)
        .eq("patient_name", patient_name);

    if (appointmentId)
        duplicateQuery = duplicateQuery.neq("appointment_id", appointmentId);

    const {data: existingAppointment} = await duplicateQuery.single();

    if (existingAppointment)
        throw new ApiError("يوجد طلب حجز مسبق بنفس البيانات", 400);

    let countQuery = supabase
        .from("appointment")
        .select("*", {count: "exact", head: true})
        .eq("schedule_id", schedule_id)
        .eq("appointment_date", appointment_date)
        .in("status", ["pending", "approved"]);

    if (appointmentId)
        countQuery = countQuery.neq("appointment_id", appointmentId);

    const {count, error: countError} = await countQuery;

    if (countError)
        throw new ApiError("حدث خطأ أثناء التحقق من عدد الحجوزات", 500);

    if (count >= schedule.max_patients)
        throw new ApiError("تم الوصول إلى الحد الأقصى للحجوزات لهذا الدوام", 400);
};
