import {supabase} from "../../config/supabase.js";
import {CACHE_KEYS} from "../../config/cache.js";
import {STORAGE_BUCKETS} from "../../config/storage.js";
import ApiError from "../../utils/ApiError.js";
import {deleteByPattern, deleteCache} from "../cache.service.js";
import {getPublicImageUrl} from "../storage.service.js";
import {
    replaceImage,
    rollbackUploadedImage,
    uploadAndProcessImage,
} from "../imageUpload.service.js";

/**
 * Creates a doctor, department relationships, and schedules through PostgreSQL.
 *
 * @param {object} doctor - Doctor fields.
 * @param {string|null} pathImage - Stored doctor image path.
 * @param {number[]} departmentIds - Department IDs.
 * @param {object[]} schedules - Doctor schedules.
 * @returns {Promise<object>} Created doctor.
 */
export const createDoctorWithRelations = async ({
    doctor,
    pathImage,
    departmentIds = [],
    schedules = [],
}) => {
    const {data, error} = await supabase.rpc("create_doctor_with_relations", {
        p_doctor: doctor,
        p_path_image: pathImage,
        p_department_ids: departmentIds,
        p_schedules: schedules,
    });

    if (error) {
        console.error("createDoctorWithRelations RPC error:", error);
        throw new ApiError(error.message || "حدث خطأ أثناء إضافة الطبيب", 400);
    }

    return data;
};

/**
 * Updates a doctor, department relationships, and schedules through PostgreSQL.
 *
 * @param {number} doctorId - Doctor ID.
 * @param {object} doctor - Updated doctor fields.
 * @param {string|null} pathImage - Stored doctor image path.
 * @param {number[]} departmentIds - Department IDs.
 * @param {object[]} schedules - Doctor schedules.
 * @returns {Promise<object>} Updated doctor.
 */
export const updateDoctorWithRelations = async ({
    doctorId,
    doctor,
    pathImage,
    departmentIds,
    schedules,
}) => {
    const {data, error} = await supabase.rpc("update_doctor_with_relations", {
        p_doctor_id: doctorId,
        p_doctor: doctor,
        p_path_image: pathImage,
        p_department_ids: departmentIds,
        p_schedules: schedules,
    });

    if (error) {
        console.error("updateDoctorWithRelations RPC error:", error);
        throw new ApiError(error.message || "حدث خطأ أثناء تعديل الطبيب", 400);
    }

    return data;
};

/**
 * Creates a doctor with its department relationships and schedules.
 * Rolls back a newly uploaded image when the database operation fails.
 *
 * @param {object} doctorData - Request body values.
 * @param {object} file - Uploaded doctor image.
 * @returns {Promise<object>} Created doctor with a public image URL.
 */
export const insertDoctor = async (doctorData, file) => {
    let path_image = null;

    try {
        path_image = await uploadAndProcessImage(STORAGE_BUCKETS.DOCTORS, file);

        const departmentIds = doctorData.department_ids
            ? JSON.parse(doctorData.department_ids)
            : [];
        const schedules = doctorData.schedules
            ? JSON.parse(doctorData.schedules)
            : [];
        const doctor = {
            full_name: doctorData.full_name,
            email: doctorData.email || null,
            bio: doctorData.bio || null,
            education: doctorData.education || null,
            gender: doctorData.gender || null,
            years_exper: doctorData.years_exper
                ? Number(doctorData.years_exper)
                : null,
            phone_number: doctorData.phone_number || null,
            notes: doctorData.notes || null,
            consultation_fee: doctorData.consultation_fee
                ? Number(doctorData.consultation_fee)
                : null,
        };

        const doctorResult = await createDoctorWithRelations({
            doctor,
            pathImage: path_image,
            departmentIds,
            schedules,
        });

        // Invalidate doctors and affected department relationship caches.
        await Promise.all([
            deleteByPattern("doctors:*"),
            deleteByPattern("doctor-departments:*"),
            deleteByPattern("doctor-schedules:*"),
            deleteByPattern("departments:*"),
            deleteCache(CACHE_KEYS.DASHBOARD),
            ...departmentIds.map((deptId) =>
                deleteCache(CACHE_KEYS.DEPARTMENT_DOCTORS(deptId)),
            ),
        ]);

        if (doctorResult?.path_image) {
            doctorResult.path_image = getPublicImageUrl(
                STORAGE_BUCKETS.DOCTORS,
                doctorResult.path_image,
            );
        }

        return doctorResult;
    } catch (error) {
        await rollbackUploadedImage(STORAGE_BUCKETS.DOCTORS, path_image);
        throw error;
    }
};

/**
 * Updates a doctor with its department relationships and schedules.
 *
 * @param {string} id - Doctor ID.
 * @param {object} doctorData - Request body values.
 * @param {object} file - Optional replacement doctor image.
 * @returns {Promise<object>} Updated doctor with a public image URL.
 */
export const updateDoctor = async (id, doctorData, file) => {
    const departmentIds = doctorData.department_ids
        ? JSON.parse(doctorData.department_ids)
        : [];
    const schedules = doctorData.schedules
        ? JSON.parse(doctorData.schedules)
        : [];
    const doctor = {
        full_name: doctorData.full_name,
        email: doctorData.email || null,
        bio: doctorData.bio || null,
        education: doctorData.education || null,
        gender: doctorData.gender || null,
        years_exper: doctorData.years_exper
            ? Number(doctorData.years_exper)
            : null,
        phone_number: doctorData.phone_number || null,
        notes: doctorData.notes || null,
        status: doctorData.status || null,
        consultation_fee: doctorData.consultation_fee
            ? Number(doctorData.consultation_fee)
            : null,
    };

    const {data: currentDoctor, error: currentError} = await supabase
        .from("doctor")
        .select("doctor_id, path_image")
        .eq("doctor_id", id)
        .single();

    if (!currentDoctor || currentError) {
        throw new ApiError("الطبيب غير موجود", 404);
    }

    const result = await replaceImage({
        bucket: STORAGE_BUCKETS.DOCTORS,
        currentImage: currentDoctor.path_image,
        file,
        action: async (newPathImage) =>
            updateDoctorWithRelations({
                doctorId: Number(id),
                doctor,
                pathImage: newPathImage || currentDoctor.path_image,
                departmentIds,
                schedules,
            }),
    });

    // Invalidate every cached representation affected by relationship updates.
    await Promise.all([
        deleteByPattern("doctors:*"),
        deleteByPattern("doctor-departments:*"),
        deleteByPattern("doctor-schedules:*"),
        deleteByPattern("departments:*"),
        deleteCache(CACHE_KEYS.DOCTOR(id)),
        deleteCache(CACHE_KEYS.DOCTOR_DEPARTMENTS(id)),
        deleteCache(CACHE_KEYS.DOCTOR_SCHEDULE(id)),
        deleteCache(CACHE_KEYS.DASHBOARD),
        ...departmentIds.map((deptId) =>
            deleteCache(CACHE_KEYS.DEPARTMENT_DOCTORS(deptId)),
        ),
    ]);

    if (result?.path_image) {
        result.path_image = getPublicImageUrl(
            STORAGE_BUCKETS.DOCTORS,
            result.path_image,
        );
    }

    return result;
};

/**
 * Toggles a doctor's booking status.
 *
 * @param {string} id - Doctor ID.
 * @returns {Promise<object>} Updated doctor status.
 */
export const changeDoctorStatus = async (id) => {
    const {data: doctor, error} = await supabase
        .from("doctor")
        .select("doctor_id, status")
        .eq("doctor_id", id)
        .single();

    if (!doctor || error) {
        throw new ApiError("الطبيب غير موجود", 404);
    }

    const {data: updatedDoctor} = await supabase
        .from("doctor")
        .update({
            status: doctor.status === "active" ? "inactive" : "active",
        })
        .eq("doctor_id", id)
        .select("doctor_id, status")
        .single();

    await deleteByPattern("doctors:*");
    await deleteCache(CACHE_KEYS.DOCTOR(id));
    await deleteCache(CACHE_KEYS.DASHBOARD);

    return updatedDoctor;
};

/**
 * Toggles whether a doctor is visible to users.
 *
 * @param {string} id - Doctor ID.
 * @returns {Promise<object>} Updated doctor visibility.
 */
export const toggleDoctorVisibility = async (id) => {
    const {data: doctor, error} = await supabase
        .from("doctor")
        .select("doctor_id, is_hidden")
        .eq("doctor_id", id)
        .single();

    if (!doctor || error) {
        throw new ApiError("الطبيب غير موجود", 404);
    }

    const {data: updatedDoctor} = await supabase
        .from("doctor")
        .update({
            is_hidden: !doctor.is_hidden,
        })
        .eq("doctor_id", id)
        .select("doctor_id, is_hidden")
        .single();

    await deleteByPattern("doctors:*");
    await deleteCache(CACHE_KEYS.DOCTOR(id));
    await deleteCache(CACHE_KEYS.DASHBOARD);

    // Preserve the existing image-path transformation after a visibility update.
    doctor.path_image = getPublicImageUrl(
        STORAGE_BUCKETS.DOCTORS,
        doctor.path_image,
    );

    return updatedDoctor;
};
