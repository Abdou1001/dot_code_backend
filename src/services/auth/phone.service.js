import {supabase} from "../../config/supabase.js";

import ApiError from "../../utils/ApiError.js";
import {normalizeYemenPhone} from "../../utils/phone.js";
import {generateOTPData, hashOTP} from "../../utils/otp.js";

import {sendOTP} from "../whatsapp.service.js";

/**
 * Request a phone number change.
 *
 * Validates the new number, stores the pending change,
 * and sends an OTP through WhatsApp.
 *
 * @param {object} data - User ID and new phone number.
 * @returns {Promise<void>}
 */
export const changePhoneNumber = async ({userId, phone_number}) => {
    // 1. Normalize the new phone number
    const phone = normalizeYemenPhone(phone_number);

    // 2. Check whether the number already exists
    const {data: existingUser} = await supabase
        .from("user")
        .select("user_id")
        .eq("phone_number", phone)
        .single();

    if (existingUser) {
        throw new ApiError("رقم الهاتف مستخدم بالفعل", 409);
    }

    // 3. Generate a verification OTP
    const {otp, hashedOTP, expires} = generateOTPData();

    // 4. Save pending number and OTP
    const {error} = await supabase
        .from("user")
        .update({
            new_phone_number: phone,
            phone_otp: hashedOTP,
            phone_otp_expires: expires,
        })
        .eq("user_id", userId);

    if (error) {
        throw new ApiError("حدث خطأ أثناء حفظ البيانات", 500);
    }

    // 5. Send OTP to the new phone number
    try {
        await sendOTP(phone, otp);
    } catch {
        throw new ApiError("فشل إرسال رمز التحقق عبر واتساب", 500);
    }

    // Existing diagnostic output
    console.log(otp);
};

/**
 * Verify a pending phone number change.
 *
 * Validates the submitted OTP and updates
 * the user's registered phone number.
 *
 * @param {object} data - User ID and OTP.
 * @returns {Promise<void>}
 */
export const verifyChangePhoneNumber = async ({userId, otp}) => {
    // 1. Hash submitted OTP
    const hashedOTP = hashOTP(otp);

    // 2. Find user with a valid OTP
    const {data: user, error} = await supabase
        .from("user")
        .select("*")
        .eq("user_id", userId)
        .eq("phone_otp", hashedOTP)
        .gt("phone_otp_expires", new Date().toISOString())
        .single();

    if (!user || error) {
        throw new ApiError("رمز التحقق غير صحيح أو انتهت صلاحيته", 400);
    }

    // 3. Update registered phone number
    const {error: updateError} = await supabase
        .from("user")
        .update({
            phone_number: user.new_phone_number,
            new_phone_number: null,
            phone_otp: null,
            phone_otp_expires: null,
        })
        .eq("user_id", user.user_id);

    if (updateError) {
        throw new ApiError("حدث خطأ أثناء تغيير رقم الهاتف", 500);
    }
};

/**
 * Resend a phone change OTP.
 *
 * Generates a new code for an existing
 * pending phone change request.
 *
 * @param {object} data - Authenticated user ID.
 * @returns {Promise<void>}
 */
export const resendChangePhoneOTP = async ({userId}) => {
    // 1. Retrieve the current user
    const {data: user, error} = await supabase
        .from("user")
        .select("*")
        .eq("user_id", userId)
        .single();

    if (!user || error) {
        throw new ApiError("المستخدم غير موجود", 404);
    }

    // 2. Ensure a phone change is pending
    if (!user.new_phone_number) {
        throw new ApiError("لا يوجد طلب تغيير رقم هاتف", 400);
    }

    // 3. Generate a new OTP
    const {otp, hashedOTP, expires} = generateOTPData();

    // 4. Update stored OTP
    await supabase
        .from("user")
        .update({
            phone_otp: hashedOTP,
            phone_otp_expires: expires,
        })
        .eq("user_id", user.user_id);

    // 5. Send OTP to pending phone number
    await sendOTP(user.new_phone_number, otp);
};
