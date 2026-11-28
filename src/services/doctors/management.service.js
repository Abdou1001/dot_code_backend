import bcrypt from "bcrypt";
import {supabase} from "../../config/supabase.js";
import {CACHE_KEYS} from "../../config/cache.js";
import {STORAGE_BUCKETS} from "../../config/storage.js";
import ApiError from "../../utils/ApiError.js";
import {isValidYemenPhone, normalizeYemenPhone} from "../../utils/phone.js";
import {deleteByPattern, deleteCache} from "../cache.service.js";
import {getPublicImageUrl} from "../storage.service.js";
import {
    replaceImage,
    rollbackUploadedImage,
    uploadAndProcessImage,
} from "../imageUpload.service.js";

/**
 * Parses a relation field received as multipart JSON or an already parsed array.
 *
 * Maintains compatibility with existing multipart clients while rejecting malformed
 * department or schedule payloads before they reach the transactional RPC.
 *
 * @param {string|Array|undefined} value - Raw relation field value.
 * @param {string} fieldName - Arabic field label for the validation error.
 * @returns {Array} Parsed relation array.
 * @throws {ApiError} When the supplied relation value is not a JSON array.
 */
const parseRelationArray = (value, fieldName) => {
    if (value === undefined || value === null || value === "") return [];
    if (Array.isArray(value)) return value;

    try {
        const parsedValue = JSON.parse(value);

        if (!Array.isArray(parsedValue)) throw new Error("Not an array");

        return parsedValue;
    } catch {
        throw new ApiError(`${fieldName} غير صالحة.`, 400);
    }
};

/**
 * Builds the professional doctor payload accepted by the account-aware RPCs.
 *
 * Excludes account-only and protected fields while preserving consultation fee
 * and fixed discount values for the account-aware PostgreSQL functions.
 *
 * @param {object} doctorData - Validated Doctor request data.
 * @param {string|null} phoneNumber - Canonical professional phone number.
 * @returns {object} Professional doctor fields.
 */
const buildDoctorPayload = (doctorData, phoneNumber) => {
    const doctor = {
        full_name: doctorData.full_name,
        email: doctorData.email || null,
        bio: doctorData.bio || null,
        education: doctorData.education || null,
        gender: doctorData.gender || null,
        years_exper: doctorData.years_exper
            ? Number(doctorData.years_exper)
            : null,
        phone_number: phoneNumber,
        notes: doctorData.notes || null,
        consultation_fee:
            doctorData.consultation_fee !== undefined
                ? Number(doctorData.consultation_fee)
                : null,
    };

    // Preserve an existing discount on updates by omitting an unspecified field.
    if (doctorData.discount_amount !== undefined) {
        doctor.discount_amount = Number(doctorData.discount_amount);
    }

    return doctor;
};

/**
 * Validates Doctor consultation pricing and fixed discount consistency.
 *
 * Uses persisted pricing during updates so changing only one monetary field
 * cannot make the retained consultation fee or discount invalid.
 *
 * @param {object} doctorData - Validated Doctor request fields.
 * @param {object|undefined} currentDoctor - Existing Doctor pricing on updates.
 * @returns {void}
 * @throws {ApiError} When a monetary value is invalid or discount exceeds fee.
 */
const validateDoctorPricing = (doctorData, currentDoctor) => {
    const consultationFee =
        doctorData.consultation_fee !== undefined
            ? Number(doctorData.consultation_fee)
            : Number(currentDoctor?.consultation_fee);
    const discountAmount =
        doctorData.discount_amount !== undefined
            ? Number(doctorData.discount_amount)
            : Number(currentDoctor?.discount_amount || 0);

    if (
        !Number.isFinite(consultationFee) ||
        !Number.isFinite(discountAmount) ||
        consultationFee < 0 ||
        discountAmount < 0
    ) {
        throw new ApiError("قيمة السعر أو الخصم غير صالحة.", 400);
    }

    if (discountAmount > consultationFee) {
        throw new ApiError("قيمة الخصم لا يمكن أن تتجاوز سعر الاستشارة.", 400);
    }
};

/**
 * Normalizes and validates a doctor's professional phone number.
 *
 * Uses the shared authentication utility so the account and doctor records use
 * one canonical Yemeni phone number without introducing a second formatter.
 *
 * @param {string} phoneNumber - Submitted doctor phone number.
 * @returns {string} Canonical Yemeni mobile phone number.
 * @throws {ApiError} When the submitted number is not a valid Yemeni mobile number.
 */
const normalizeDoctorPhone = (phoneNumber) => {
    const normalizedPhone = normalizeYemenPhone(phoneNumber);

    if (!isValidYemenPhone(normalizedPhone))
        throw new ApiError("رقم الهاتف اليمني غير صالح", 400);

    return normalizedPhone;
};

/**
 * Builds permitted linked-user profile fields for the update RPC.
 *
 * Deliberately omits passwords, roles, phone verification, and login credentials
 * because those values must not change through Doctor update requests.
 *
 * @param {object} doctorData - Validated Doctor update data.
 * @returns {object} Permitted linked account fields.
 */
const buildAccountUpdatePayload = (doctorData) => {
    const account = {};

    if (doctorData.date_of_birth !== undefined)
        account.date_of_birth = doctorData.date_of_birth;

    if (doctorData.gender !== undefined) account.gender = doctorData.gender;

    return account;
};

/**
 * Creates a doctor profile and linked login account through PostgreSQL.
 *
 * Sends only the bcrypt password hash to the account-aware RPC so user, doctor,
 * departments, and schedules are created in one database transaction.
 *
 * @param {object} payload - Doctor, account, image, department, and schedule data.
 * @param {object} payload.doctor - Professional doctor fields.
 * @param {object} payload.account - Account fields including password hash.
 * @param {string|null} payload.pathImage - Stored doctor image path.
 * @param {Array<number>} payload.departmentIds - Department IDs.
 * @param {Array<object>} payload.schedules - Doctor schedules.
 * @returns {Promise<object>} Created doctor and linked account result.
 */
const createDoctorWithAccount = async ({
    doctor,
    account,
    pathImage,
    departmentIds,
    schedules,
}) => {
    const {data, error} = await supabase.rpc("create_doctor_with_account", {
        p_doctor: doctor,
        p_account: account,
        p_path_image: pathImage,
        p_department_ids: departmentIds,
        p_schedules: schedules,
    });

    if (error)
        throw new ApiError(error.message || "حدث خطأ أثناء إضافة الطبيب", 400);

    return data;
};

/**
 * Updates a doctor profile and permitted linked-user fields through PostgreSQL.
 *
 * Delegates department and schedule synchronization to the account-aware RPC while
 * preserving its appointment protections for existing schedules.
 *
 * @param {object} payload - Doctor update, account, image, and relation data.
 * @param {number} payload.doctorId - Doctor record ID.
 * @param {object} payload.doctor - Professional doctor fields.
 * @param {object} payload.account - Permitted linked account fields.
 * @param {string|null} payload.pathImage - Stored doctor image path.
 * @param {Array<number>} payload.departmentIds - Department IDs.
 * @param {Array<object>} payload.schedules - Doctor schedules.
 * @returns {Promise<object>} Updated doctor and linked account result.
 */
const updateDoctorWithAccount = async ({
    doctorId,
    doctor,
    account,
    pathImage,
    departmentIds,
    schedules,
}) => {
    const {data, error} = await supabase.rpc("update_doctor_with_account", {
        p_doctor_id: doctorId,
        p_doctor: doctor,
        p_account: account,
        p_path_image: pathImage,
        p_department_ids: departmentIds,
        p_schedules: schedules,
    });

    if (error)
        throw new ApiError(error.message || "حدث خطأ أثناء تعديل الطبيب", 400);

    return data;
};

/**
 * Creates a doctor profile, linked login account, departments, and schedules.
 *
 * Hashes the Admin-supplied initial password before uploading the image and uses
 * the account-aware PostgreSQL RPC to keep all database records atomic.
 *
 * @param {object} doctorData - Request body values.
 * @param {object} file - Uploaded doctor image.
 * @returns {Promise<object>} Created doctor with a public image URL.
 */
export const insertDoctor = async (doctorData, file) => {
    let path_image = null;

    try {
        // 1. Validate relation payloads before uploading a storage object.
        const departmentIds = parseRelationArray(
            doctorData.department_ids,
            "الأقسام المحددة",
        );
        const schedules = parseRelationArray(doctorData.schedules, "أوقات الدوام");

        // 2. Validate the fixed discount before creating the linked account.
        validateDoctorPricing(doctorData);

        // 3. Use the authentication phone format in both account and doctor payloads.
        const normalizedPhone = normalizeDoctorPhone(doctorData.phone_number);

        // 4. Hash the initial login password; plaintext never reaches PostgreSQL.
        const password_hash = await bcrypt.hash(doctorData.password, 12);

        // 5. Process and upload the doctor profile image.
        path_image = await uploadAndProcessImage(STORAGE_BUCKETS.DOCTORS, file);

        // 6. Create the account and all doctor records atomically through PostgreSQL.
        const doctorResult = await createDoctorWithAccount({
            doctor: buildDoctorPayload(doctorData, normalizedPhone),
            account: {
                full_name: doctorData.full_name,
                email: doctorData.email || null,
                phone_number: normalizedPhone,
                date_of_birth: doctorData.date_of_birth,
                gender: doctorData.gender,
                password_hash,
            },
            pathImage: path_image,
            departmentIds,
            schedules,
        });

        // 7. Invalidate cached professional and relationship representations.
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
        // 8. Remove the uploaded image when the transactional database call fails.
        await rollbackUploadedImage(STORAGE_BUCKETS.DOCTORS, path_image);
        throw error;
    }
};

/**
 * Updates a doctor, linked user profile, departments, and schedules.
 *
 * Uses the account-aware RPC without accepting passwords, roles, account links,
 * or login credentials from the Doctor update request.
 *
 * @param {string} id - Doctor ID.
 * @param {object} doctorData - Request body values.
 * @param {object} file - Optional replacement doctor image.
 * @returns {Promise<object>} Updated doctor with a public image URL.
 */
export const updateDoctor = async (id, doctorData, file) => {
    // 1. Validate relation JSON before modifying storage or database records.
    const departmentIds = parseRelationArray(
        doctorData.department_ids,
        "الأقسام المحددة",
    );
    const schedules = parseRelationArray(doctorData.schedules, "أوقات الدوام");
    const normalizedPhone = doctorData.phone_number
        ? normalizeDoctorPhone(doctorData.phone_number)
        : null;

    const {data: currentDoctor, error: currentError} = await supabase
        .from("doctor")
        .select("doctor_id, path_image, consultation_fee, discount_amount")
        .eq("doctor_id", id)
        .single();

    if (!currentDoctor || currentError) {
        throw new ApiError("الطبيب غير موجود", 404);
    }

    // 2. Compare partial pricing updates with the persisted complementary value.
    validateDoctorPricing(doctorData, currentDoctor);

    // 3. Replace the image only after the account-aware RPC succeeds.
    const result = await replaceImage({
        bucket: STORAGE_BUCKETS.DOCTORS,
        currentImage: currentDoctor.path_image,
        file,
        action: async (newPathImage) =>
            updateDoctorWithAccount({
                doctorId: Number(id),
                doctor: buildDoctorPayload(doctorData, normalizedPhone),
                account: buildAccountUpdatePayload(doctorData),
                pathImage: newPathImage || currentDoctor.path_image,
                departmentIds,
                schedules,
            }),
    });

    // 4. Invalidate every cached representation affected by relationship updates.
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
