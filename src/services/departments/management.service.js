import {supabase} from "../../config/supabase.js";
import {CACHE_KEYS} from "../../config/cache.js";
import {STORAGE_BUCKETS} from "../../config/storage.js";
import ApiError from "../../utils/ApiError.js";
import {deleteByPattern, deleteCache} from "../cache.service.js";
import {deleteImage, getPublicImageUrl} from "../storage.service.js";
import {
    replaceImage,
    rollbackUploadedImage,
    uploadAndProcessImage,
} from "../imageUpload.service.js";

/**
 * Creates a department and uploads its image.
 * Rolls back a newly uploaded image when insertion fails.
 *
 * @param {object} departmentData - Department fields.
 * @param {object} file - Uploaded department image.
 * @returns {Promise<object>} Created department with a public image URL.
 */
export const insertDepartment = async ({depart_name}, file) => {
    let path_image = null;

    try {
        path_image = await uploadAndProcessImage(
            STORAGE_BUCKETS.DEPARTMENTS,
            file,
        );

        const {data: department, error} = await supabase
            .from("department")
            .insert({
                depart_name,
                path_image,
            })
            .select("*")
            .single();

        if (!department || error) {
            throw new ApiError(
                "حدث خطاء أثناء إضافة القسم، حاول مرة اخرى",
                400,
            );
        }

        await deleteByPattern("departments:*");
        await deleteCache(CACHE_KEYS.DASHBOARD);

        department.path_image = getPublicImageUrl(
            STORAGE_BUCKETS.DEPARTMENTS,
            department.path_image,
        );

        return department;
    } catch (error) {
        await rollbackUploadedImage(STORAGE_BUCKETS.DEPARTMENTS, path_image);
        throw error;
    }
};

/**
 * Updates a department and replaces its image when a new file is supplied.
 *
 * @param {string} id - Department ID.
 * @param {object} departmentData - Updated department fields.
 * @param {object} file - Optional replacement image.
 * @returns {Promise<object>} Updated department with a public image URL.
 */
export const updatetDepartment = async (id, {depart_name}, file) => {
    const {data: currentDepartment, error: currentError} = await supabase
        .from("department")
        .select("*")
        .eq("depart_id", id)
        .single();

    if (!currentDepartment || currentError) {
        throw new ApiError("القسم غير موجود", 404);
    }

    if (depart_name) {
        const {data: department} = await supabase
            .from("department")
            .select("depart_id")
            .eq("depart_name", depart_name)
            .neq("depart_id", id)
            .single();

        if (department) {
            throw new ApiError("اسم القسم موجود بالفعل", 400);
        }
    }

    const department = await replaceImage({
        bucket: STORAGE_BUCKETS.DEPARTMENTS,
        currentImage: currentDepartment.path_image,
        file,
        action: async (path_image) => {
            const {data, error} = await supabase
                .from("department")
                .update({
                    depart_name,
                    path_image,
                })
                .eq("depart_id", id)
                .select("*")
                .single();

            if (!data || error) {
                throw new ApiError(
                    "حدث خطاء أثناء تعديل القسم، حاول مرة اخرى",
                    400,
                );
            }

            return data;
        },
    });

    await deleteByPattern("departments:*");
    await deleteCache(CACHE_KEYS.DEPARTMENT(id));
    await deleteCache(CACHE_KEYS.DASHBOARD);

    department.path_image = getPublicImageUrl(
        STORAGE_BUCKETS.DEPARTMENTS,
        department.path_image,
    );

    return department;
};

/**
 * Deletes a department, its doctor relationships, image, and cache entries.
 *
 * @param {string} id - Department ID.
 * @returns {Promise<object>} Deleted department.
 */
export const deleteDepartment = async (id) => {
    const {error: relationError} = await supabase
        .from("doctor_department")
        .delete()
        .eq("depart_id", id);

    if (relationError) {
        throw new ApiError("حدث خطأ أثناء حذف ارتباطات القسم", 500);
    }

    const {data: department, error} = await supabase
        .from("department")
        .delete()
        .eq("depart_id", id)
        .select("*")
        .single();

    if (!department || error) {
        throw new ApiError("القسم غير موجود", 404);
    }

    await deleteImage(STORAGE_BUCKETS.DEPARTMENTS, department.path_image);

    await deleteByPattern("departments:*");
    await deleteCache(CACHE_KEYS.DEPARTMENT(id));
    await deleteCache(CACHE_KEYS.DEPARTMENT_DOCTORS(id));
    await deleteByPattern("doctor-departments:*");
    await deleteByPattern("doctors:*");
    await deleteCache(CACHE_KEYS.DASHBOARD);

    return department;
};
