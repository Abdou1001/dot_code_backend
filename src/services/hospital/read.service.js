import {supabase} from "../../config/supabase.js";
import {CACHE_KEYS, CACHE_TTL} from "../../config/cache.js";
import {STORAGE_BUCKETS} from "../../config/storage.js";
import ApiError from "../../utils/ApiError.js";
import {getCache, setCache} from "../cache.service.js";
import {getPublicImageUrl} from "../storage.service.js";

/**
 * Retrieves cached or persisted hospital information.
 *
 * @returns {Promise<{message: string, results: object}>} Hospital details.
 */
export const getHospitalInfo = async () => {
    const cachedHospital = await getCache(CACHE_KEYS.HOSPITAL);

    if (cachedHospital) {
        cachedHospital.path_image = getPublicImageUrl(
            STORAGE_BUCKETS.HOSPITALS,
            cachedHospital.path_image,
        );

        return {
            message: "تم جلب البيانات من Redis",
            results: cachedHospital,
        };
    }

    const {data: hospital, error} = await supabase
        .from("hospital")
        .select("*")
        .single();

    if (!hospital || error) {
        throw new ApiError("حدث خطأ أثناء جلب البيانات، حاول مرة أخرى", 500);
    }

    await setCache(CACHE_KEYS.HOSPITAL, hospital, CACHE_TTL.HOSPITAL);

    hospital.path_image = getPublicImageUrl(
        STORAGE_BUCKETS.HOSPITALS,
        hospital.path_image,
    );

    return {
        message: "تم جلب البيانات بنجاح",
        results: hospital,
    };
};
