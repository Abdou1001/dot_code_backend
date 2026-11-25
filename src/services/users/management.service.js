import bcrypt from "bcrypt";
import {supabase} from "../../config/supabase.js";
import ApiError from "../../utils/ApiError.js";

const selectedColumns = `user_id,full_name,email,role,date_of_birth,gender,phone_number,created_at,is_active`;

const mapReceptionDepartmentRpcError = (error) => {
    if (error.message.includes("USER_NOT_FOUND"))
        throw new ApiError("المستخدم غير موجود.", 404);

    if (error.message.includes("USER_NOT_RECEPTION")) {
        throw new ApiError(
            "لا يمكن منح صلاحيات الأقسام إلا لموظفي الاستقبال.",
            400,
        );
    }

    if (error.message.includes("INVALID_DEPARTMENTS"))
        throw new ApiError("أحد الأقسام المحددة غير موجود أو غير متاح.", 400);

    throw new ApiError("حدث خطأ أثناء تحديث صلاحيات الأقسام.", 500);
};

/** Updates a user record from the administration routes. */
export const updateUser = async (id, {full_name, date_of_birth, gender, email}) => {
    const {data: user, error} = await supabase
        .from("user")
        .update({full_name, date_of_birth, gender, email})
        .eq("user_id", id)
        .select(selectedColumns)
        .single();

    if (error || !user) {
        throw new ApiError("حدث خطأ أثناء تحديث المستخدم", 400);
    }

    return user;
};

/** Toggles a user's account status while preventing self-deactivation. */
export const changeUserStatus = async (id, actorId) => {
    const {data: currentUser, error} = await supabase
        .from("user")
        .select("user_id,is_active")
        .eq("user_id", id)
        .single();

    if (!currentUser || error) {
        throw new ApiError("المستخدم غير موجود", 404);
    }
    if (actorId == id) {
        throw new ApiError("لا يمكنك توقيف حسابك", 400);
    }

    const {data: user, error: updateError} = await supabase
        .from("user")
        .update({
            is_active: currentUser.is_active === "active" ? "inactive" : "active",
        })
        .eq("user_id", id)
        .select(selectedColumns)
        .single();

    if (!user || updateError) {
        throw new ApiError("حدث خطأ أثناء تغيير حالة المستخدم", 400);
    }

    return user;
};

/** Changes a user's role while preventing self-role changes. */
export const changeUserRole = async (id, role, actorId) => {
    if (actorId == id) {
        throw new ApiError("لا يمكنك تغيير صلاحيتك", 400);
    }

    const {error: roleError} = await supabase.rpc(
        "change_user_role_and_clear_reception_departments",
        {p_user_id: Number(id), p_role: role},
    );

    if (roleError) {
        if (roleError.message.includes("USER_NOT_FOUND"))
            throw new ApiError("المستخدم غير موجود", 404);

        throw new ApiError("حدث خطأ أثناء تغيير صلاحية المستخدم", 400);
    }

    const {data: user, error} = await supabase
        .from("user")
        .select(selectedColumns)
        .eq("user_id", id)
        .single();

    if (!user || error) {
        throw new ApiError("حدث خطأ أثناء تغيير صلاحية المستخدم", 400);
    }

    return user;
};

/** Retrieves the departments assigned to a Reception employee. */
export const getReceptionDepartments = async (userId) => {
    const {data: user, error: userError} = await supabase
        .from("user")
        .select("user_id,role")
        .eq("user_id", userId)
        .single();

    if (!user || userError) throw new ApiError("المستخدم غير موجود.", 404);

    if (user.role !== "reception") {
        throw new ApiError(
            "لا يمكن منح صلاحيات الأقسام إلا لموظفي الاستقبال.",
            400,
        );
    }

    const {data: departments, error} = await supabase
        .from("reception_departments")
        .select("depart_id")
        .eq("user_id", userId);

    if (error)
        throw new ApiError("حدث خطأ أثناء جلب صلاحيات الأقسام.", 500);

    return departments || [];
};


/**
 * Replaces a Reception employee's department assignments.
 *
 * Only users with the "reception" role can receive
 * department permissions.
 *
 * @param {number} userId - Target user ID.
 * @param {number[]} depart_ids - Department IDs.
 * @returns {Promise<Array>} Updated assigned departments.
 */
export const updateReceptionDepartments = async (
    userId,
    depart_ids
) => {
    // 1. Verify the target user exists
    const { data: user, error: userError } = await supabase
        .from("user")
        .select("user_id, role")
        .eq("user_id", userId)
        .maybeSingle();

    if (userError) {
        throw new ApiError(
            "حدث خطأ أثناء التحقق من بيانات المستخدم.",
            500
        );
    }

    if (!user) {
        throw new ApiError("المستخدم غير موجود.", 404);
    }

    // 2. Only Reception employees can receive departments
    if (user.role !== "reception") {
        throw new ApiError(
            "لا يمكن منح صلاحيات الأقسام إلا لموظفي الاستقبال.",
            400
        );
    }

    // 3. Validate department IDs
    if (
        !Array.isArray(depart_ids) ||
        depart_ids.some(
            (id) => !Number.isSafeInteger(id) || id <= 0
        ) ||
        new Set(depart_ids).size !== depart_ids.length
    ) {
        throw new ApiError(
            "قائمة الأقسام غير صالحة. يرجى اختيار أقسام صحيحة دون تكرار.",
            400
        );
    }

    // 4. Replace assignments inside a database transaction
    const { error } = await supabase.rpc(
        "replace_reception_departments",
        {
            p_user_id: Number(userId),
            p_depart_ids: depart_ids,
        }
    );

    if (error) {
        // Log the actual database error for debugging
        console.error("Reception Departments RPC Error:", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
        });

        mapReceptionDepartmentRpcError(error);
    }

    // 5. Return the latest assigned departments
    return getReceptionDepartments(userId);
};

/** Updates the authenticated user's profile fields. */
export const updateMyProfile = async (
    userId,
    {full_name, date_of_birth, gender, emali},
) => {
    const {data: user, error} = await supabase
        .from("user")
        .update({full_name, date_of_birth, gender, emali})
        .eq("user_id", userId)
        .select(selectedColumns)
        .single();

    if (!user || error) {
        throw new ApiError("حدث خطأ أثناء تحديث الملف الشخصي", 400);
    }

    return user;
};

/** Changes the authenticated user's password after verifying the current password. */
export const changeMyPassword = async (userId, {current_password, new_password}) => {
    const {data: user, error} = await supabase
        .from("user")
        .select("*")
        .eq("user_id", userId)
        .single();

    if (!user || error) {
        throw new ApiError("المستخدم غير موجود", 404);
    }

    const correctPassword = await bcrypt.compare(current_password, user.password);

    if (!correctPassword) {
        throw new ApiError("كلمة المرور الحالية غير صحيحة", 400);
    }

    const hashedPassword = await bcrypt.hash(new_password, 12);
    const {error: updateError} = await supabase
        .from("user")
        .update({password: hashedPassword, password_changed_at: new Date()})
        .eq("user_id", userId);

    if (updateError) {
        throw new ApiError("حدث خطأ أثناء تغيير كلمة المرور", 500);
    }
};
