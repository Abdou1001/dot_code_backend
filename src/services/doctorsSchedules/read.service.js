import {supabase} from "../../config/supabase.js";
import {CACHE_KEYS, CACHE_TTL} from "../../config/cache.js";
import {STORAGE_BUCKETS} from "../../config/storage.js";
import ApiError from "../../utils/ApiError.js";
import {paginationResult} from "../../utils/pagination.js";
import {getCache, setCache} from "../cache.service.js";
import {getPublicImageUrl} from "../storage.service.js";
import {getLinkedDoctor} from "../doctors/access.service.js";

const daysOrder = {
    "السبت": 1,
    "الاحد": 2,
    "الاثنين": 3,
    "الثلاثاء": 4,
    "الاربعاء": 5,
    "الخميس": 6,
    "الجمعة": 7,
};

/** Retrieves paginated schedules with the existing filters and doctor search. */
export const getDoctorsSchedulesInfo = async (queryParams) => {
    const {
        doctor_id,
        shift_type,
        status,
        start_time,
        end_time,
        keyword = "",
    } = queryParams;
    const page = queryParams.page * 1 || 1;
    const limit = queryParams.limit * 1 || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const cacheKey = `doctor-schedules:page=${page}:limit=${limit}:doctor=${doctor_id || "all"}:keyword=${keyword}:shift=${shift_type || "all"}:status=${status || "all"}:start=${start_time || "all"}:end=${end_time || "all"}`;
    const cachedSchedules = await getCache(cacheKey);

    if (cachedSchedules) {
        cachedSchedules.results.forEach((schedule) => {
            schedule.doctor.path_image = getPublicImageUrl(
                STORAGE_BUCKETS.DOCTORS,
                schedule.doctor.path_image,
            );
        });

        return {
            message: "تم جلب البيانات من Redis",
            pagination: cachedSchedules.pagination,
            results: cachedSchedules.results,
            count: cachedSchedules.count,
        };
    }

    let query = supabase.from("doctor_schedule").select("*, doctor (*)", {
        count: "exact",
    });

    if (keyword) {
        const {data: doctors} = await supabase
            .from("doctor")
            .select("doctor_id")
            .ilike("full_name", `%${keyword}%`);
        const doctorIds = doctors?.map((doctor) => doctor.doctor_id) || [];

        if (doctorIds.length === 0) {
            const pagination = paginationResult(page, limit, 0);
            await setCache(
                cacheKey,
                {pagination, results: [], count: 0},
                CACHE_TTL.DOCTOR_SCHEDULES,
            );
            return {message: "تم جلب البيانات بنجاح", pagination, results: [], count: 0};
        }

        query = query.in("doctor_id", doctorIds);
    }

    if (doctor_id) query = query.eq("doctor_id", doctor_id);
    if (shift_type) query = query.eq("shift_type", shift_type);
    if (status) query = query.eq("status", status);
    if (start_time) query = query.gte("start_time", start_time);
    if (end_time) query = query.lte("end_time", end_time);

    const {data, error, count} = await query.range(from, to);

    if (!data || error) {
        throw new ApiError("حدث خطأ أثناء جلب الأوقات", 500);
    }

    // Sort the selected page by weekday, then by the schedule start time.
    data.sort((a, b) => {
        const dayCompare = daysOrder[a.day_of_week] - daysOrder[b.day_of_week];
        return dayCompare !== 0
            ? dayCompare
            : a.start_time.localeCompare(b.start_time);
    });

    const pagination = paginationResult(page, limit, count);
    await setCache(
        cacheKey,
        {pagination, results: data, count},
        CACHE_TTL.DOCTOR_SCHEDULES,
    );

    data.forEach((schedule) => {
        schedule.doctor.path_image = getPublicImageUrl(
            STORAGE_BUCKETS.DOCTORS,
            schedule.doctor.path_image,
        );
    });

    return {message: "تم جلب البيانات بنجاح", pagination, results: data, count};
};

/** Retrieves and orders all schedules belonging to one doctor. */
export const getDoctorSchedulesInfo = async (id) => {
    const cacheKey = CACHE_KEYS.DOCTOR_SCHEDULE(id);
    const cachedSchedules = await getCache(cacheKey);

    if (cachedSchedules) {
        return {message: "تم جلب البيانات من Redis", results: cachedSchedules};
    }

    const {data: schedules, error} = await supabase
        .from("doctor_schedule")
        .select("*")
        .eq("doctor_id", id);

    if (error) {
        throw new ApiError("حدث خطأ أثناء جلب أوقات دوام الطبيب", 500);
    }

    schedules.sort((a, b) => {
        const dayCompare = daysOrder[a.day_of_week] - daysOrder[b.day_of_week];
        return dayCompare !== 0
            ? dayCompare
            : a.start_time.localeCompare(b.start_time);
    });

    await setCache(cacheKey, schedules, CACHE_TTL.DOCTOR_SCHEDULE);

    return {
        message: schedules.length
            ? "تم جلب أوقات دوام الطبيب بنجاح"
            : "لا توجد أوقات دوام لهذا الطبيب",
        results: schedules,
    };
};

/**
 * Retrieves schedules belonging to the authenticated doctor's linked record.
 *
 * The doctor ID is resolved from the authenticated user rather than request
 * input, so a Doctor-role account cannot read another doctor's schedules.
 *
 * @param {number} userId - Authenticated doctor user ID.
 * @returns {Promise<object>} Existing schedule response for the linked doctor.
 */
export const getDoctorSchedulesForUser = async (userId) => {
    // 1. Resolve the authorized doctor from the authenticated account.
    const doctor = await getLinkedDoctor(userId);

    // 2. Reuse the existing per-doctor schedule response and ordering.
    return getDoctorSchedulesInfo(doctor.doctor_id);
};
