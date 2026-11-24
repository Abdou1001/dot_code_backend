import {supabase} from "../../config/supabase.js";
import {CACHE_KEYS, CACHE_TTL} from "../../config/cache.js";
import {STORAGE_BUCKETS} from "../../config/storage.js";
import ApiError from "../../utils/ApiError.js";
import {paginationResult} from "../../utils/pagination.js";
import {getCache, setCache} from "../cache.service.js";
import {getPublicImageUrl} from "../storage.service.js";

/**
 * Retrieves paginated doctors with filters, sorting, department relationships,
 * and public image URLs.
 *
 * @param {object} queryParams - Doctor query parameters.
 * @returns {Promise<{message: string, pagination: object, results: object[]}>}
 */
export const getDoctorsInfo = async (queryParams) => {
    const page = queryParams.page * 1 || 1;
    const limit = queryParams.limit * 1 || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const {
        keyword = "",
        status,
        gender,
        min_experience,
        max_experience,
        min_fee,
        max_fee,
        sort = "full_name",
    } = queryParams;
    const cacheKey = `doctors:page=${page}:limit=${limit}:keyword=${keyword}:status=${status || "all"}:gender=${gender || "all"}:minExp=${min_experience || 0}:maxExp=${max_experience || "max"}:minFee=${min_fee || 0}:maxFee=${max_fee || "max"}:sort=${sort}`;

    const cachedDoctors = await getCache(cacheKey);

    if (cachedDoctors) {
        cachedDoctors.results.forEach((doctor) => {
            doctor.path_image = getPublicImageUrl(
                STORAGE_BUCKETS.DOCTORS,
                doctor.path_image,
            );
        });

        return {
            message: "تم جلب البيانات من Redis",
            pagination: cachedDoctors.pagination,
            results: cachedDoctors.results,
        };
    }

    let query = supabase
        .from("doctor")
        .select(
            `
                *,
                doctor_department (
                    doctor_deprtment_id,
                    department (
                        depart_id,
                        depart_name
                    )
                )
            `,
            {count: "exact"},
        )
        .or(
            `full_name.ilike.%${keyword}%,bio.ilike.%${keyword}%,education.ilike.%${keyword}%`,
        );

    if (status) query = query.eq("status", status);

    if (gender) query = query.eq("gender", gender);

    if (min_experience) query = query.gte("years_exper", min_experience);

    if (max_experience) query = query.lte("years_exper", max_experience);

    if (min_fee) query = query.gte("consultation_fee", min_fee);

    if (max_fee) query = query.lte("consultation_fee", max_fee);

    query = query.order(sort.startsWith("-") ? sort.substring(1) : sort, {
        ascending: !sort.startsWith("-"),
    });

    const {data: doctors, error, count} = await query.range(from, to);

    if (error || !doctors) {
        throw new ApiError("حدث خطأ أثناء جلب الأطباء", 500);
    }

    const pagination = paginationResult(page, limit, count);

    // Cache raw image paths and transform them only for the response.
    await setCache(
        cacheKey,
        {
            pagination,
            results: doctors,
        },
        CACHE_TTL.DOCTORS,
    );

    doctors.forEach((doctor) => {
        doctor.path_image = getPublicImageUrl(
            STORAGE_BUCKETS.DOCTORS,
            doctor.path_image,
        );
    });

    return {
        message: "تم جلب الأطباء بنجاح",
        pagination,
        results: doctors,
    };
};

/**
 * Retrieves one doctor with department and schedule relationships.
 *
 * @param {string} id - Doctor ID.
 * @returns {Promise<{message: string, results: object}>}
 */
export const getOneDoctorInfo = async (id) => {
    const cacheKey = CACHE_KEYS.DOCTOR(id);
    const cachedDoctor = await getCache(cacheKey);

    if (cachedDoctor) {
        cachedDoctor.path_image = getPublicImageUrl(
            STORAGE_BUCKETS.DOCTORS,
            cachedDoctor.path_image,
        );

        return {
            message: "تم جلب البيانات من Redis",
            results: cachedDoctor,
        };
    }

    const {data: doctor, error} = await supabase
        .from("doctor")
        .select(
            `
                *,
                doctor_department (
                    doctor_deprtment_id,
                    department (
                        depart_id,
                        depart_name
                    )
                ),
                doctor_schedule (
                    schedule_id,
                    day_of_week,
                    shift_type,
                    start_time,
                    end_time,
                    status,
                    max_patients,
                    notes
                )
            `,
        )
        .eq("doctor_id", id)
        .single();

    if (!doctor || error) {
        throw new ApiError("حدث خطأ في جلب الطبيب، حاول مرة أخرى", 404);
    }

    await setCache(cacheKey, doctor, CACHE_TTL.DOCTORS);

    doctor.path_image = getPublicImageUrl(
        STORAGE_BUCKETS.DOCTORS,
        doctor.path_image,
    );

    return {
        message: "تم جلب الطبيب بنجاح",
        results: doctor,
    };
};
