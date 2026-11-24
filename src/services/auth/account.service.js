import {supabase} from "../../config/supabase.js";
import ApiError from "../../utils/ApiError.js";

/**
 * Get the currently authenticated user's profile.
 *
 * Retrieves only profile fields, excluding passwords
 * and sensitive verification information.
 *
 * @param {number} userId - Authenticated user ID.
 * @returns {Promise<object>} User profile.
 */

export const getMe = async (userId) => {
    // 1. Fetch the current user's profile
    const {data: user, error} = await supabase
        .from("user")
        .select(
            `
            user_id,
            full_name,
            email,
            date_of_birth,
            gender,
            phone_number,
            role,
            is_active,
            created_at
        `,
        )
        .eq("user_id", userId)
        .single();

    // 2. Handle missing user or database error
    if (!user || error) {
        throw new ApiError("المستخدم غير موجود", 404);
    }

    // 3. Return profile data
    return user;
};
