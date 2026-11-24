import bcrypt from "bcrypt";

import {supabase} from "../../config/supabase.js";

import ApiError from "../../utils/ApiError.js";
import {normalizeYemenPhone} from "../../utils/phone.js";
import {generateOTPData, hashOTP} from "../../utils/otp.js";

import {sendOTP} from "../whatsapp.service.js";

/**
 * Request a password reset.
 *
 * Finds a verified user, generates a reset OTP,
 * saves its hash, and sends the code via WhatsApp.
 *
 * @param {object} data - Registered phone number.
 * @returns {Promise<void>}
 */
export const forgetPassword = async ({phone_number}) => {
    // 1. Normalize phone number
    const phone = normalizeYemenPhone(phone_number);

    // 2. Find the registered user
    const {data: user, error} = await supabase
        .from("user")
        .select("*")
        .eq("phone_number", phone)
        .single();

    if (!user || error) {
        throw new ApiError("رقم الهاتف غير موجود", 404);
    }

    // 3. Require phone verification
    if (!user.phone_verified) {
        throw new ApiError("الحساب غير مفعل، يرجى تفعيل رقم الهاتف أولاً", 400);
    }

    // 4. Generate a password reset OTP
    const {otp, hashedOTP, expires} = generateOTPData();

    // 5. Save reset code and expiration
    const {error: updateError} = await supabase
        .from("user")
        .update({
            password_reset_code: hashedOTP,
            password_reset_expires: expires,
            password_reset_verified: false,
        })
        .eq("user_id", user.user_id);

    if (updateError) {
        throw new ApiError("حدث خطأ أثناء إنشاء رمز التحقق", 500);
    }

    // 6. Send reset OTP through WhatsApp
    try {
        await sendOTP(phone, otp);
    } catch {
        // Clear reset data if WhatsApp delivery fails
        await supabase
            .from("user")
            .update({
                password_reset_code: null,
                password_reset_expires: null,
                password_reset_verified: false,
            })
            .eq("user_id", user.user_id);

        throw new ApiError(
            "فشل إرسال رمز التحقق عبر واتساب، حاول مرة أخرى",
            500,
        );
    }

    // Existing diagnostic output
    console.log(otp);
};

/**
 * Verify the password reset code.
 *
 * Checks the submitted code against its stored hash
 * and expiration date.
 *
 * @param {object} data - Phone number and reset code.
 * @returns {Promise<void>}
 */
export const verifyPasswordResetCode = async ({phone_number, resetCode}) => {
    // 1. Normalize phone number
    const phone = normalizeYemenPhone(phone_number);

    // 2. Hash the submitted reset code
    const hashedPasswordResetCode = hashOTP(resetCode);

    // 3. Find user with valid reset credentials
    const {data: user, error} = await supabase
        .from("user")
        .select("*")
        .eq("phone_number", phone)
        .eq("password_reset_code", hashedPasswordResetCode)
        .gt("password_reset_expires", new Date().toISOString())
        .single();

    if (!user || error) {
        throw new ApiError(
            "رمز التحقق غير صالح أو انتهت صلاحيته، حاول مرة أخرى",
            400,
        );
    }

    // 4. Mark the reset request as verified
    const {error: updateError} = await supabase
        .from("user")
        .update({
            password_reset_verified: true,
        })
        .eq("user_id", user.user_id);

    if (updateError) {
        throw new ApiError("حدث خطأ، حاول مرة أخرى", 400);
    }
};

/**
 * Reset the user's password.
 *
 * Requires a previously verified reset request,
 * hashes the new password, and clears reset credentials.
 *
 * @param {object} data - Phone number and new password.
 * @returns {Promise<void>}
 */
export const resetPassword = async ({phone_number, newPassword}) => {
    // 1. Normalize phone number
    const phone = normalizeYemenPhone(phone_number);

    // 2. Find the user
    const {data: user, error} = await supabase
        .from("user")
        .select("*")
        .eq("phone_number", phone)
        .single();

    if (!user || error) {
        throw new ApiError("المستخدم غير موجود، حاول مرة أخرى", 404);
    }

    // 3. Require a verified reset request
    if (!user.password_reset_verified) {
        throw new ApiError("رمز التحقق غير صالح أو لم يتم التحقق منه", 401);
    }

    // 4. Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 5. Update password and clear reset credentials
    const {data: updatedUser, error: updateError} = await supabase
        .from("user")
        .update({
            password: hashedPassword,
            password_reset_code: null,
            password_reset_expires: null,
            password_reset_verified: false,
            password_changed_at: new Date(),
        })
        .eq("phone_number", phone)
        .select("*")
        .single();

    if (!updatedUser || updateError) {
        throw new ApiError(
            "حدث خطأ أثناء تغيير كلمة المرور، حاول مرة أخرى",
            400,
        );
    }
};
