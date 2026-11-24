import {supabase} from "../../config/supabase.js";
import {CACHE_KEYS} from "../../config/cache.js";
import {STORAGE_BUCKETS} from "../../config/storage.js";
import ApiError from "../../utils/ApiError.js";
import {deleteCache} from "../cache.service.js";
import {replaceImage} from "../imageUpload.service.js";
import {getPublicImageUrl} from "../storage.service.js";

/**
 * Updates hospital settings and optionally replaces the hospital image.
 *
 * @param {object} hospitalData - Hospital fields.
 * @param {object} file - Optional replacement image.
 * @returns {Promise<object>} Updated hospital with a public image URL.
 */
export const updateHospitalInfo = async (
    {hospital_name, location, phone_number},
    file,
) => {
    const {data: currentHospital, error: currentError} = await supabase
        .from("hospital")
        .select("*")
        .eq("hospital_id", 1)
        .single();

    if (!currentHospital || currentError) {
        throw new ApiError("المستشفى غير موجودة", 404);
    }

    const hospital = await replaceImage({
        bucket: STORAGE_BUCKETS.HOSPITALS,
        currentImage: currentHospital.path_image,
        file,
        action: async (path_image) => {
            const updateData = {};

            if (hospital_name) updateData.hospital_name = hospital_name;
            if (location) updateData.location = location;
            if (phone_number) updateData.phone_number = phone_number;
            if (path_image) updateData.path_image = path_image;

            const {data, error} = await supabase
                .from("hospital")
                .update(updateData)
                .eq("hospital_id", 1)
                .select("*")
                .single();

            if (!data || error) {
                throw new ApiError("حدث خطأ أثناء تحديث بيانات المستشفى", 500);
            }

            return data;
        },
    });

    // Clear the cached hospital profile and dashboard data after an update.
    await deleteCache(CACHE_KEYS.HOSPITAL);
    await deleteCache(CACHE_KEYS.DASHBOARD);

    hospital.path_image = getPublicImageUrl(
        STORAGE_BUCKETS.HOSPITALS,
        hospital.path_image,
    );

    return hospital;
};
