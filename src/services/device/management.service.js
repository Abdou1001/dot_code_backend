import {supabase} from "../../config/supabase.js";
import ApiError from "../../utils/ApiError.js";

/**
 * Registers a device or reactivates an existing push-token record.
 *
 * @param {number|null} userId - Authenticated user ID, when available.
 * @param {object} deviceData - Device push token and platform.
 * @returns {Promise<{created: boolean, device: object}>} Stored device result.
 */
export const registerDevice = async (userId, {expo_push_token, platform}) => {
    if (!expo_push_token) {
        throw new ApiError("Expo Push Token مطلوب", 400);
    }

    const {data: existingDevice, error: findError} = await supabase
        .from("user_devices")
        .select("*")
        .eq("expo_push_token", expo_push_token)
        .maybeSingle();

    if (findError) {
        throw new ApiError("حدث خطأ أثناء التحقق من الجهاز", 500);
    }

    if (existingDevice) {
        const {data: device, error} = await supabase
            .from("user_devices")
            .update({
                user_id: userId,
                platform,
                is_active: true,
                updated_at: new Date().toISOString(),
            })
            .eq("device_id", existingDevice.device_id)
            .select("*")
            .single();

        if (error) {
            throw new ApiError("حدث خطأ أثناء تحديث بيانات الجهاز", 500);
        }

        return {created: false, device};
    }

    const {data: device, error} = await supabase
        .from("user_devices")
        .insert({
            user_id: userId,
            expo_push_token,
            platform,
            is_active: true,
        })
        .select("*")
        .single();

    if (error) {
        throw new ApiError("حدث خطأ أثناء تسجيل الجهاز", 500);
    }

    return {created: true, device};
};

/**
 * Removes a device only when it belongs to the current user or guest session.
 *
 * @param {number|null} userId - Authenticated user ID, when available.
 * @param {object} deviceData - Device push token.
 * @returns {Promise<object>} Removed device.
 */
export const removeDevice = async (userId, {expo_push_token}) => {
    if (!expo_push_token) {
        throw new ApiError("Expo Push Token مطلوب", 400);
    }

    let query = supabase
        .from("user_devices")
        .delete()
        .eq("expo_push_token", expo_push_token);

    // Restrict deletion to the current owner, including guest devices.
    if (userId) {
        query = query.eq("user_id", userId);
    } else {
        query = query.is("user_id", null);
    }

    const {data: device, error} = await query.select("*").maybeSingle();

    if (error) {
        throw new ApiError("حدث خطأ أثناء حذف الجهاز", 500);
    }

    if (!device) {
        throw new ApiError("الجهاز غير موجود", 404);
    }

    return device;
};
