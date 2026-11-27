import {supabase} from "../../config/supabase.js";
import {STORAGE_BUCKETS} from "../../config/storage.js";
import {getPublicImageUrl} from "../storage.service.js";
import ApiError from "../../utils/ApiError.js";

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

    // 2. Preserve the existing doctor image response convention.
    if (doctor.path_image) {
        doctor.path_image = getPublicImageUrl(
            STORAGE_BUCKETS.DOCTORS,
            doctor.path_image,
        );
    }

    return doctor;
};
