import bcrypt from "bcrypt";

import {supabase} from "../../config/supabase.js";

import ApiError from "../../utils/ApiError.js";
import {normalizeYemenPhone} from "../../utils/phone.js";
import {generateOTPData} from "../../utils/otp.js";

import {sendOTP} from "../whatsapp.service.js";

/**
 * Register a user or resend verification OTP.
 *
 * Creates a new account when the phone number is unused.
 * For existing unverified accounts, updates and resends OTP.
 *
 * @param {object} userData - Registration details.
 * @returns {Promise<boolean>} True if a new user was created.
 */
export const register = async ({
    full_name,
    email,
    password,
    date_of_birth,
    gender,
    phone_number,
}) => {
    // 1. Normalize phone number
    const phone = normalizeYemenPhone(phone_number);

    // 2. Check whether the phone number exists
    const {data: existingUser} = await supabase
        .from("user")
        .select("*")
        .eq("phone_number", phone)
        .maybeSingle();

    // 3. Handle an existing account
    if (existingUser) {
        // Prevent registration of an already verified user
        if (existingUser.phone_verified) {
            throw new ApiError(
                "رقم الهاتف مسجل بالفعل، يمكنك تسجيل الدخول",
                409,
            );
        }

        // Generate a new verification OTP
        const {otp, hashedOTP, expires} = generateOTPData();

        // Update the stored verification code
        const {error: updateError} = await supabase
            .from("user")
            .update({
                phone_otp: hashedOTP,
                phone_otp_expires: expires,
            })
            .eq("user_id", existingUser.user_id);

        if (updateError) {
            throw new ApiError("حدث خطأ أثناء إنشاء رمز التحقق", 500);
        }

        // Send another OTP to the registered phone
        await sendOTP(phone, otp);

        // Existing account, no new user created
        return false;
    }

    // 4. Hash password before storing it
    const hashedPassword = await bcrypt.hash(password, 12);

    // 5. Generate phone verification OTP
    const {otp, hashedOTP, expires} = generateOTPData();

    // 6. Create an unverified user account
    const {data: user, error} = await supabase
        .from("user")
        .insert([
            {
                full_name,
                email: email || null,
                password: hashedPassword,
                date_of_birth,
                gender,
                phone_number: phone,
                phone_verified: false,
                phone_otp: hashedOTP,
                phone_otp_expires: expires,
                role: "user",
                is_active: "active",
                created_at: new Date(),
            },
        ])
        .select("*")
        .single();

    // 7. Handle account creation errors
    if (error) {
        console.error(error);

        throw new ApiError("حدث خطأ أثناء إنشاء الحساب، حاول مرة أخرى", 400);
    }

    // 8. Send verification OTP through WhatsApp
    await sendOTP(phone, otp);

    return true;
};
