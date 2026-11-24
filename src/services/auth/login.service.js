import bcrypt from "bcrypt";

import {supabase} from "../../config/supabase.js";
import ApiError from "../../utils/ApiError.js";
import {normalizeYemenPhone} from "../../utils/phone.js";

/**
 * Authenticate a regular user.
 *
 * Validates credentials, phone verification,
 * and account activation status.
 *
 * @param {object} credentials - Login credentials.
 * @returns {Promise<object>} Authenticated user.
 */
export const login = async ({login, password}) => {
    // 1. Find user by email or phone number
    let query = supabase.from("user").select("*");

    if (login.includes("@")) {
        query = query.eq("email", login.trim().toLowerCase());
    } else {
        query = query.eq("phone_number", normalizeYemenPhone(login));
    }

    const {data: user, error} = await query.single();

    // 2. Verify credentials
    if (
        error ||
        !user ||
        !(await bcrypt.compare(password, user?.password || ""))
    ) {
        throw new ApiError(
            "رقم الهاتف أو البريد الإلكتروني أو كلمة المرور غير صحيحة",
            401,
        );
    }

    // 3. Check phone verification
    if (!user.phone_verified) {
        throw new ApiError(
            "الحساب غير مفعل. يرجى إكمال تفعيل رقم الهاتف، أو إعادة التسجيل لإرسال رمز تحقق جديد.",
            401,
        );
    }

    // 4. Check account activation
    if (user.is_Active == "inactive") {
        throw new ApiError(
            "الحساب موقف من الإدارة، يرجى التواصل مع الإدارة",
            401,
        );
    }

    return user;
};

/**
 * Authenticate an administrator.
 *
 * Validates credentials and restricts dashboard
 * access to users with the admin role.
 *
 * @param {object} credentials - Admin login credentials.
 * @returns {Promise<object>} Authenticated administrator.
 */
export const adminLogin = async ({login, password}) => {
    // 1. Find user by email or phone number
    let query = supabase.from("user").select("*");

    if (login.includes("@")) {
        query = query.eq("email", login.trim().toLowerCase());
    } else {
        query = query.eq("phone_number", normalizeYemenPhone(login));
    }

    const {data: user, error} = await query.single();

    // 2. Verify administrator credentials
    if (
        error ||
        !user ||
        !(await bcrypt.compare(password, user?.password || ""))
    ) {
        throw new ApiError("بيانات الدخول غير صحيحة", 401);
    }

    // 3. Restrict dashboard access to admins
    if (user.role !== "admin") {
        throw new ApiError("ليس لديك صلاحية الدخول إلى لوحة الإدارة", 403);
    }

    // 4. Check phone verification
    if (!user.phone_verified) {
        throw new ApiError(
            "الحساب غير مفعل. يرجى إكمال تفعيل رقم الهاتف.",
            401,
        );
    }

    // 5. Check account activation
    if (user.is_Active === "inactive") {
        throw new ApiError(
            "الحساب موقف من الإدارة، يرجى التواصل مع الإدارة",
            401,
        );
    }

    return user;
};
