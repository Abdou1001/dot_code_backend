import bcrypt from "bcrypt";
import {supabase} from "../../config/supabase.js";
import ApiError from "../../utils/ApiError.js";

const selectedColumns = `user_id,full_name,email,role,date_of_birth,gender,phone_number,created_at,is_active`;

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

    const {data: user, error} = await supabase
        .from("user")
        .update({role})
        .eq("user_id", id)
        .select(selectedColumns)
        .single();

    if (!user || error) {
        throw new ApiError("حدث خطأ أثناء تغيير صلاحية المستخدم", 400);
    }

    return user;
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
