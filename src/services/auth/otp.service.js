import {supabase} from "../../config/supabase.js";
import {CACHE_KEYS} from "../../config/cache.js";

import ApiError from "../../utils/ApiError.js";
import {normalizeYemenPhone} from "../../utils/phone.js";
import {generateOTPData, hashOTP} from "../../utils/otp.js";

import {sendOTP} from "../whatsapp.service.js";
import {deleteCache} from "../cache.service.js";

/**
 * Verify the phone number OTP.
 *
 * Validates the submitted code, activates the account,
 * and clears the stored verification information.
 *
 * @param {object} data - Phone number and OTP.
 * @returns {Promise<object>} Verified user.
 */
export const verifyPhoneOTP = async ({phone_number, otp}) => {
    // 1. Normalize phone number and hash OTP
    const phone = normalizeYemenPhone(phone_number);
    const hashedOTP = hashOTP(otp);

    // 2. Retrieve user
    const {data: user, error} = await supabase
        .from("user")
        .select("*")
        .eq("phone_number", phone)
        .single();

    if (!user || error) {
        throw new ApiError("الحساب غير موجود", 404);
    }

    // 3. Prevent duplicate activation
    if (user.phone_verified) {
        throw new ApiError("تم تفعيل الحساب مسبقًا، يمكنك تسجيل الدخول", 400);
    }

    // 4. Compare submitted OTP
    if (user.phone_otp !== hashedOTP) {
        throw new ApiError("رمز التحقق غير صحيح، حاول مرة اخرى", 400);
    }

    // 5. Check OTP expiration (original behavior)
    const expiresAt = Date.parse(user.phone_otp_expires);

    console.log("Expires:", new Date(expiresAt).toISOString());
    console.log("Now:", new Date().toISOString());

    if (Date.now() > user.phone_otp_expires) {
        throw new ApiError("انتهت صلاحية رمز التحقق", 400);
    }

    // 6. Activate the account and clear OTP
    const {data: verifiedUser, error: updateError} = await supabase
        .from("user")
        .update({
            phone_verified: true,
            phone_otp: null,
            phone_otp_expires: null,
        })
        .eq("user_id", user.user_id)
        .select("*")
        .single();

    if (!verifiedUser || updateError) {
        throw new ApiError("حدث خطأ أثناء تفعيل الحساب", 500);
    }

    // 7. Invalidate dashboard cache
    await deleteCache(CACHE_KEYS.DASHBOARD);

    return verifiedUser;
};

/**
 * Resend a phone verification OTP.
 *
 * Generates a new code for an unverified account,
 * stores its hash, and sends it via WhatsApp.
 *
 * @param {object} data - Phone number.
 * @returns {Promise<void>}
 */
export const resendOTP = async ({phone_number}) => {
    // 1. Normalize phone number
    const phone = normalizeYemenPhone(phone_number);

    // 2. Retrieve user
    const {data: user, error} = await supabase
        .from("user")
        .select("*")
        .eq("phone_number", phone)
        .single();

    if (!user || error) {
        throw new ApiError("الحساب غير موجود", 404);
    }

    // 3. Ensure account requires verification
    if (user.phone_verified) {
        throw new ApiError("تم تفعيل الحساب مسبقًا، يمكنك تسجيل الدخول", 400);
    }

    // 4. Generate a fresh OTP
    const {otp, hashedOTP, expires} = generateOTPData();

    // 5. Save hashed OTP and expiration
    const {error: updateError} = await supabase
        .from("user")
        .update({
            phone_otp: hashedOTP,
            phone_otp_expires: expires,
        })
        .eq("user_id", user.user_id);

    if (updateError) {
        throw new ApiError("حدث خطأ أثناء إنشاء رمز التحقق", 500);
    }

    // 6. Send OTP via WhatsApp
    try {
        await sendOTP(phone, otp);
    } catch {
        throw new ApiError(
            "فشل إرسال رمز التحقق عبر واتساب، حاول مرة أخرى",
            500,
        );
    }
};
