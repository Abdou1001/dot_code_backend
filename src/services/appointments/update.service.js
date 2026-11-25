import {supabase} from "../../config/supabase.js";
import {CACHE_KEYS} from "../../config/cache.js";
import {deleteCache} from "../cache.service.js";
import ApiError from "../../utils/ApiError.js";
import {
    formatAppointment,
    selectStatment,
} from "./appointment.helpers.js";
import {assertReceptionAppointmentAccess} from "./receptionAuthorization.service.js";

const PATIENT_EDITABLE_FIELDS = [
    "patient_name",
    "patient_phone",
    "patient_age",
    "patient_gender",
    "notes",
];

const PROTECTED_UPDATE_MESSAGE =
    "لا يمكن تغيير تاريخ أو طبيب أو قسم أو جدول دوام الحجز بعد إنشائه. يمكنك تعديل بياناتك الشخصية فقط.";

/**
 * Updates only the personal information attached to a patient's pending appointment.
 */
export const updateUserAppointment = async ({id, userId, body, file, user}) => {
    const protectedFields = Object.keys(body).filter(
        (field) => !PATIENT_EDITABLE_FIELDS.includes(field),
    );

    if (protectedFields.length > 0 || file)
        throw new ApiError(PROTECTED_UPDATE_MESSAGE, 400);

    const {data: currentAppointment, error: currentError} = await supabase
        .from("appointment")
        .select("*")
        .eq("appointment_id", id)
        .eq("user_id", userId)
        .single();

    if (!currentAppointment || currentError)
        throw new ApiError("الحجز غير موجود", 404);

    await assertReceptionAppointmentAccess(currentAppointment, user);

    if (currentAppointment.status !== "pending")
        throw new ApiError("لا يمكن تعديل الحجز بعد مراجعته", 400);

    const personalInfo = {};

    PATIENT_EDITABLE_FIELDS.forEach((field) => {
        if (body[field] !== undefined) personalInfo[field] = body[field];
    });

    // Only allow the explicitly selected personal fields in the database update.
    const {data: appointment, error} = await supabase
        .from("appointment")
        .update(personalInfo)
        .eq("appointment_id", id)
        .select(selectStatment)
        .single();

    if (!appointment || error)
        throw new ApiError("حدث خطأ أثناء تعديل الحجز", 400);

    await deleteCache(CACHE_KEYS.DASHBOARD);
    await formatAppointment(appointment);

    return appointment;
};
