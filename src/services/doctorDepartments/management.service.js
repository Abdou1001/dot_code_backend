import {supabase} from "../../config/supabase.js";
import {CACHE_KEYS} from "../../config/cache.js";
import {STORAGE_BUCKETS} from "../../config/storage.js";
import ApiError from "../../utils/ApiError.js";
import {deleteByPattern, deleteCache} from "../cache.service.js";
import {getPublicImageUrl} from "../storage.service.js";

const selectStatment = `doctor_deprtment_id,doctor (*),department (*)`;

/** Assigns a doctor to a department after validating both records. */
export const assignDoctorToDepartment = async ({doctor_id, depart_id}) => {
    const {data: doctor, error: errorDoctors} = await supabase
        .from("doctor")
        .select("*")
        .eq("doctor_id", doctor_id)
        .single();

    if (!doctor || errorDoctors) {
        throw new ApiError("الدكتور الذي اضفته غير موجود!", 404);
    }

    const {data: depart, error: errorDepart} = await supabase
        .from("department")
        .select("*")
        .eq("depart_id", depart_id)
        .single();

    if (!depart || errorDepart) {
        throw new ApiError("القسم غير موجود!", 404);
    }

    // Prevent duplicate doctor-to-department assignments.
    const {data: existingRelation} = await supabase
        .from("doctor_department")
        .select("doctor_department_id")
        .eq("doctor_id", doctor_id)
        .eq("depart_id", depart_id)
        .single();

    if (existingRelation) {
        throw new ApiError("الدكتور مرتبط بهذا القسم مسبقاً", 400);
    }

    const {data: assign, error} = await supabase
        .from("doctor_department")
        .insert({depart_id, doctor_id})
        .select(selectStatment)
        .single();

    if (!assign || error) {
        throw new ApiError("حدث خطأ أثناء ربط الدكتور بالقسم", 400);
    }

    await deleteByPattern("doctor-departments:*");
    await deleteCache(CACHE_KEYS.DOCTOR_DEPARTMENTS(doctor_id));
    await deleteCache(CACHE_KEYS.DEPARTMENT_DOCTORS(depart_id));
    await deleteCache(CACHE_KEYS.DOCTOR(doctor_id));
    await deleteByPattern("doctors:*");
    await deleteByPattern("departments:*");
    await deleteCache(CACHE_KEYS.DASHBOARD);

    assign.doctor.path_image = getPublicImageUrl(
        STORAGE_BUCKETS.DOCTORS,
        assign.doctor.path_image,
    );
    assign.department.path_image = getPublicImageUrl(
        STORAGE_BUCKETS.DEPARTMENTS,
        assign.department.path_image,
    );

    return assign;
};

/** Updates an existing doctor-department relationship. */
export const updateDoctorDepartment = async (id, {doctor_id, depart_id}) => {
    const {data: relation, error: relationError} = await supabase
        .from("doctor_department")
        .select("doctor_deprtment_id, doctor_id, depart_id")
        .eq("doctor_deprtment_id", id)
        .single();

    if (!relation || relationError) {
        throw new ApiError("العلاقة غير موجودة", 404);
    }

    const {data: doctor, error: doctorError} = await supabase
        .from("doctor")
        .select("doctor_id")
        .eq("doctor_id", doctor_id)
        .single();

    if (!doctor || doctorError) {
        throw new ApiError("الدكتور غير موجود", 404);
    }

    const {data: department, error: departmentError} = await supabase
        .from("department")
        .select("depart_id")
        .eq("depart_id", depart_id)
        .single();

    if (!department || departmentError) {
        throw new ApiError("القسم غير موجود", 404);
    }

    const {data: existingRelation} = await supabase
        .from("doctor_department")
        .select("doctor_deprtment_id")
        .eq("doctor_id", doctor_id)
        .eq("depart_id", depart_id)
        .neq("doctor_department_id", id)
        .single();

    if (existingRelation) {
        throw new ApiError("الدكتور مرتبط بهذا القسم مسبقاً", 400);
    }

    const {data: updatedRelation, error: updateError} = await supabase
        .from("doctor_department")
        .update({doctor_id, depart_id})
        .eq("doctor_deprtment_id", id)
        .select(selectStatment)
        .single();

    if (!updatedRelation || updateError) {
        throw new ApiError("حدث خطأ أثناء تعديل العلاقة", 400);
    }

    await deleteByPattern("doctor-departments:*");
    await deleteCache(CACHE_KEYS.DOCTOR_DEPARTMENT(id));
    await deleteCache(CACHE_KEYS.DOCTOR_DEPARTMENTS(relation.doctor_id));
    await deleteCache(CACHE_KEYS.DEPARTMENT_DOCTORS(relation.depart_id));
    await deleteCache(CACHE_KEYS.DOCTOR(relation.doctor_id));

    if (doctor_id && doctor_id !== relation.doctor_id) {
        await deleteCache(CACHE_KEYS.DOCTOR_DEPARTMENTS(doctor_id));
        await deleteCache(CACHE_KEYS.DOCTOR(doctor_id));
    }
    if (depart_id && depart_id !== relation.depart_id) {
        await deleteCache(CACHE_KEYS.DEPARTMENT_DOCTORS(depart_id));
    }

    await deleteByPattern("doctors:*");
    await deleteByPattern("departments:*");
    await deleteCache(CACHE_KEYS.DASHBOARD);

    updatedRelation.doctor.path_image = getPublicImageUrl(
        STORAGE_BUCKETS.DOCTORS,
        updatedRelation.doctor.path_image,
    );
    updatedRelation.department.path_image = getPublicImageUrl(
        STORAGE_BUCKETS.DEPARTMENTS,
        updatedRelation.department.path_image,
    );

    return updatedRelation;
};

/** Deletes a doctor-department relationship and its affected cache entries. */
export const deleteDoctorFromDepartment = async (id) => {
    const {data: relation, error: relationError} = await supabase
        .from("doctor_department")
        .select("doctor_deprtment_id, doctor_id, depart_id")
        .eq("doctor_deprtment_id", id)
        .single();

    if (!relation || relationError) {
        throw new ApiError("العلاقة غير موجودة", 404);
    }

    const {data: deleteRelation, error: deleteError} = await supabase
        .from("doctor_department")
        .delete()
        .eq("doctor_deprtment_id", id)
        .select("doctor_deprtment_id")
        .single();

    if (!deleteRelation || deleteError) {
        throw new ApiError("حدث خطأ أثناء حذف العلاقة", 400);
    }

    await deleteByPattern("doctor-departments:*");
    await deleteCache(CACHE_KEYS.DOCTOR_DEPARTMENT(id));
    await deleteCache(CACHE_KEYS.DOCTOR_DEPARTMENTS(relation.doctor_id));
    await deleteCache(CACHE_KEYS.DEPARTMENT_DOCTORS(relation.depart_id));
    await deleteCache(CACHE_KEYS.DOCTOR(relation.doctor_id));
    await deleteByPattern("doctors:*");
    await deleteByPattern("departments:*");
    await deleteCache(CACHE_KEYS.DASHBOARD);

    return deleteRelation;
};
