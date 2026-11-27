import {supabase} from "../../config/supabase.js";
import {STORAGE_BUCKETS} from "../../config/storage.js";
import {getPublicImageUrl} from "../storage.service.js";
import ApiError from "../../utils/ApiError.js";
import {CACHE_KEYS} from "../../config/cache.js";
import {deleteByPattern, deleteCache} from "../cache.service.js";
import {applyEffectiveDoctorBookingState} from "./booking.service.js";

/**
 * Resolves the doctor record linked to an authenticated doctor user.
 *
 * The lookup is always derived from the authenticated user ID so callers
 * cannot choose another doctor's identity through request input.
 *
 * @param {number} userId - Authenticated user ID.
 * @returns {Promise<object>} Linked doctor record.
 * @throws {ApiError} When the doctor account has no linked doctor record.
 */
export const getLinkedDoctor = async (userId) => {
    // 1. Resolve the professional record only from the server-authenticated user.
    const {data: doctor, error} = await supabase
        .from("doctor")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

    if (!doctor || error)
        throw new ApiError("حساب الطبيب غير مرتبط بملف طبي.", 404);

    return doctor;
};

/**
 * Retrieves the professional profile for an authenticated doctor.
 *
 * Converts the stored profile image path to its public URL without
 * loading any sensitive user authentication data.
 *
 * @param {number} userId - Authenticated doctor user ID.
 * @returns {Promise<object>} Doctor profile.
 */
export const getMyDoctorProfile = async (userId) => {
    // 1. Resolve the linked doctor before returning professional information.
    const doctor = await getLinkedDoctor(userId);

    applyEffectiveDoctorBookingState(doctor);

    // 2. Preserve the existing doctor image response convention.
    if (doctor.path_image) {
        doctor.path_image = getPublicImageUrl(
            STORAGE_BUCKETS.DOCTORS,
            doctor.path_image,
        );
    }

    return doctor;
};

/**
 * Toggles booking availability for the authenticated Doctor.
 *
 * Delegates identity checks, row locking, appointment cancellation, and durable
 * notification-task creation to one PostgreSQL transaction.
 *
 * @param {number} userId - Authenticated Doctor account ID.
 * @param {string|undefined} reopenDate - Optional inclusive local closure date.
 * @returns {Promise<object>} Updated booking state and cancellation summary.
 * @throws {ApiError} When the account cannot change Doctor booking availability.
 */
export const toggleDoctorBooking = async (userId, reopenDate) => {
    // 1. The RPC locks the linked Doctor row before toggling or cancelling.
    const {data, error} = await supabase.rpc("toggle_doctor_booking", {
        p_user_id: Number(userId),
        p_reopen_date: reopenDate || null,
    });

    if (error) {
        if (error.message.includes("DOCTOR_BOOKING_ACCOUNT_NOT_FOUND")) {
            throw new ApiError("حساب الطبيب غير مرتبط بملف طبي.", 404);
        }

        if (error.message.includes("DOCTOR_ACCOUNT_INACTIVE")) {
            throw new ApiError("حساب الطبيب غير نشط لإدارة الحجوزات.", 403);
        }

        if (error.message.includes("BOOKING_REOPEN_DATE_IN_PAST")) {
            throw new ApiError("تاريخ إعادة فتح الحجوزات لا يمكن أن يكون في الماضي.", 400);
        }

        if (error.message.includes("REOPEN_DATE_NOT_ALLOWED")) {
            throw new ApiError("لا يمكن تحديد تاريخ عند إعادة فتح الحجوزات.", 400);
        }

        throw new ApiError("حدث خطأ أثناء تغيير حالة حجوزات الطبيب.", 400);
    }

    const booking = Array.isArray(data) ? data[0] : data;

    // 2. Invalidate stale availability and appointment statistics after commit.
    await Promise.all([
        deleteByPattern("doctors:*"),
        deleteByPattern("appointments-chart:*"),
        deleteCache(CACHE_KEYS.DOCTOR(booking.doctor_id)),
        deleteCache(CACHE_KEYS.DASHBOARD),
    ]);

    return booking;
};
