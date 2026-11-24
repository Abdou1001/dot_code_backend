import {supabase} from "../../config/supabase.js";
import {CACHE_KEYS, CACHE_TTL} from "../../config/cache.js";
import {STORAGE_BUCKETS} from "../../config/storage.js";
import ApiError from "../../utils/ApiError.js";
import {paginationResult} from "../../utils/pagination.js";
import {getCache, setCache} from "../cache.service.js";
import {getPublicImageUrl} from "../storage.service.js";

/**
 * Retrieves paginated departments with doctor counts, sorting, and image URLs.
 *
 * @param {object} queryParams - Department query parameters.
 * @returns {Promise<{message: string, pagination: object, results: object[]}>}
 */
export const getDepartmentsInfo = async (queryParams) => {
    const page = queryParams.page * 1 || 1;
    const limit = queryParams.limit * 1 || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const keyword = queryParams.keyword || "";
    const sort = queryParams.sort || "name";
    const cacheKey = `departments:page=${page}:limit=${limit}:keyword=${keyword}:sort=${sort}`;

    const cachedDepartments = await getCache(cacheKey);

    if (cachedDepartments) {
        cachedDepartments.results.forEach((department) => {
            department.path_image = getPublicImageUrl(
                STORAGE_BUCKETS.DEPARTMENTS,
                department.path_image,
            );
        });

        return {
            message: "تم جلب البيانات من Redis",
            pagination: cachedDepartments.pagination,
            results: cachedDepartments.results,
        };
    }

    const query = supabase
        .from("department")
        .select(
            `
                *,
                doctor_department(count)
            `,
            {count: "exact"},
        )
        .ilike("depart_name", `%${keyword}%`);

    const {data: departments, error, count} = await query.range(from, to);

    if (error) {
        throw new ApiError("حدث خطأ أثناء جلب الأقسام", 500);
    }

    // Flatten the relationship aggregate into the existing doctors_count field.
    departments.forEach((department) => {
        department.doctors_count =
            department.doctor_department?.[0]?.count || 0;

        delete department.doctor_department;
    });

    if (sort === "most_doctors") {
        departments.sort((a, b) => b.doctors_count - a.doctors_count);
    } else if (sort === "least_doctors") {
        departments.sort((a, b) => a.doctors_count - b.doctors_count);
    } else {
        departments.sort((a, b) =>
            a.depart_name.localeCompare(b.depart_name, "ar"),
        );
    }

    const pagination = paginationResult(page, limit, count);

    // Cache filenames, then return public URLs only in the HTTP result.
    await setCache(
        cacheKey,
        {
            pagination,
            results: departments,
        },
        CACHE_TTL.DEPARTMENTS,
    );

    const results = departments.map((department) => ({
        ...department,
        path_image: getPublicImageUrl(
            STORAGE_BUCKETS.DEPARTMENTS,
            department.path_image,
        ),
    }));

    return {
        message: "تم جلب الأقسام بنجاح",
        pagination,
        results,
    };
};

/**
 * Retrieves one department and converts its stored image path to a public URL.
 *
 * @param {string} id - Department ID.
 * @returns {Promise<{message: string, results: object}>}
 */
export const getOneDepartmentInfo = async (id) => {
    const cacheKey = CACHE_KEYS.DEPARTMENT(id);
    const cachedDepartment = await getCache(cacheKey);

    if (cachedDepartment) {
        cachedDepartment.path_image = getPublicImageUrl(
            STORAGE_BUCKETS.DEPARTMENTS,
            cachedDepartment.path_image,
        );

        return {
            message: "تم جلب البيانات من Redis",
            results: cachedDepartment,
        };
    }

    const {data: department, error} = await supabase
        .from("department")
        .select("*")
        .eq("depart_id", id)
        .single();

    if (!department || error) {
        throw new ApiError("القسم غير موجود", 404);
    }

    await setCache(cacheKey, department, CACHE_TTL.DEPARTMENTS);

    department.path_image = getPublicImageUrl(
        STORAGE_BUCKETS.DEPARTMENTS,
        department.path_image,
    );

    return {
        message: "تم جلب القسم بنجاح",
        results: department,
    };
};
