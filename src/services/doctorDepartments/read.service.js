import {supabase} from "../../config/supabase.js";
import {CACHE_KEYS, CACHE_TTL} from "../../config/cache.js";
import {STORAGE_BUCKETS} from "../../config/storage.js";
import ApiError from "../../utils/ApiError.js";
import {paginationResult} from "../../utils/pagination.js";
import {getCache, setCache} from "../cache.service.js";
import {getPublicImageUrl} from "../storage.service.js";

const selectStatment = `doctor_deprtment_id,doctor (*),department (*)`;

const addPublicImageUrls = (relations) => {
    relations.forEach((relation) => {
        relation.doctor.path_image = getPublicImageUrl(
            STORAGE_BUCKETS.DOCTORS,
            relation.doctor.path_image,
        );
        relation.department.path_image = getPublicImageUrl(
            STORAGE_BUCKETS.DEPARTMENTS,
            relation.department.path_image,
        );
    });
};

/** Retrieves paginated doctor-department relationships with keyword search. */
export const getDoctorDepartmentsInfo = async (queryParams) => {
    const page = queryParams.page * 1 || 1;
    const limit = queryParams.limit * 1 || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const {keyword = "", sort = "doctor_deprtment_id"} = queryParams;
    const cacheKey = `doctor-departments:page=${page}:limit=${limit}:keyword=${keyword}:sort=${sort}`;
    const cachedRelations = await getCache(cacheKey);

    if (cachedRelations) {
        addPublicImageUrls(cachedRelations.results);
        return {
            message: "تم جلب البيانات من Redis",
            pagination: cachedRelations.pagination,
            results: cachedRelations.results,
        };
    }

    let query = supabase.from("doctor_department").select(selectStatment, {
        count: "exact",
    });

    if (keyword) {
        const {data: doctors} = await supabase
            .from("doctor")
            .select("doctor_id")
            .ilike("full_name", `%${keyword}%`);
        const {data: departments} = await supabase
            .from("department")
            .select("depart_id")
            .ilike("depart_name", `%${keyword}%`);
        const doctorIds = doctors?.map((doctor) => doctor.doctor_id) || [];
        const departmentIds = departments?.map((department) => department.depart_id) || [];

        if (doctorIds.length === 0 && departmentIds.length === 0) {
            return {
                message: "تم جلب البيانات بنجاح",
                pagination: paginationResult(page, limit, 0),
                results: [],
            };
        }

        const conditions = [];
        if (doctorIds.length > 0) {
            conditions.push(`doctor_id.in.(${doctorIds.join(",")})`);
        }
        if (departmentIds.length > 0) {
            conditions.push(`depart_id.in.(${departmentIds.join(",")})`);
        }
        query = query.or(conditions.join(","));
    }

    query = query.order(sort, {ascending: true});
    const {data: relations, error, count} = await query.range(from, to);

    if (!relations || error) {
        throw new ApiError("حدث خطأ أثناء جلب البيانات", 500);
    }

    const pagination = paginationResult(page, limit, count);
    await setCache(
        cacheKey,
        {pagination, results: relations},
        CACHE_TTL.DOCTORS,
    );
    addPublicImageUrls(relations);

    return {message: "تم جلب البيانات بنجاح", pagination, results: relations};
};

/** Retrieves one doctor-department relationship by ID. */
export const getOneDoctorDepartmentInfo = async (id) => {
    const cacheKey = CACHE_KEYS.DOCTOR_DEPARTMENT(id);
    const cachedRelation = await getCache(cacheKey);

    if (cachedRelation) {
        addPublicImageUrls([cachedRelation]);
        return {message: "تم جلب البيانات من Redis", results: cachedRelation};
    }

    const {data: relation, error} = await supabase
        .from("doctor_department")
        .select(selectStatment)
        .eq("doctor_deprtment_id", id)
        .single();

    if (!relation || error) {
        throw new ApiError("علاقة الدكتور بالقسم غير موجودة", 404);
    }

    await setCache(cacheKey, relation, CACHE_TTL.DOCTOR_DEPARTMENTS);
    addPublicImageUrls([relation]);

    return {message: "تم جلب البيانات بنجاح", results: relation};
};

/** Retrieves all doctor relationships for a department. */
export const getDoctorsByDepartment = async (id) => {
    const cacheKey = `department:${id}:doctors`;
    const cachedDoctors = await getCache(cacheKey);

    if (cachedDoctors) {
        addPublicImageUrls(cachedDoctors);
        return {message: "تم جلب البيانات من Redis", results: cachedDoctors};
    }

    const {data: department, error: departmentError} = await supabase
        .from("department")
        .select("depart_id")
        .eq("depart_id", id)
        .single();

    if (!department || departmentError) {
        throw new ApiError("القسم غير موجود", 404);
    }

    const {data: doctors, error} = await supabase
        .from("doctor_department")
        .select(selectStatment)
        .eq("depart_id", id);

    if (!doctors || error) {
        throw new ApiError("حدث خطأ أثناء جلب الدكاترة", 500);
    }

    await setCache(cacheKey, doctors, CACHE_TTL.DOCTOR_DEPARTMENTS);
    addPublicImageUrls(doctors);

    return {message: "تم جلب البيانات بنجاح", results: doctors};
};

/** Retrieves all department relationships for a doctor. */
export const getDepartmentsByDoctor = async (id) => {
    const cacheKey = `doctor:${id}:departments`;
    const cachedDepartments = await getCache(cacheKey);

    if (cachedDepartments) {
        addPublicImageUrls(cachedDepartments);
        return {message: "تم جلب البيانات من Redis", results: cachedDepartments};
    }

    const {data: doctor, error: doctorError} = await supabase
        .from("doctor")
        .select("doctor_id")
        .eq("doctor_id", id)
        .single();

    if (!doctor || doctorError) {
        throw new ApiError("الدكتور غير موجود", 404);
    }

    const {data: departments, error} = await supabase
        .from("doctor_department")
        .select(selectStatment)
        .eq("doctor_id", id);

    if (!departments || error) {
        throw new ApiError("حدث خطأ أثناء جلب الأقسام", 500);
    }

    await setCache(cacheKey, departments, CACHE_TTL.DOCTOR_DEPARTMENTS);
    addPublicImageUrls(departments);

    return {message: "تم جلب البيانات بنجاح", results: departments};
};
