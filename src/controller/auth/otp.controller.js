import AsyncHandler from "express-async-handler";
import {
    resendOTP as resendOTPService,
    verifyPhoneOTP as verifyPhoneOTPService,
} from "../../services/auth/otp.service.js";
import {createSendToken} from "../../services/auth/auth.helpers.js";

/** Verifies the phone OTP and signs in the verified user. */
export const verifyPhoneOTP = AsyncHandler(async (req, res) => {
    const user = await verifyPhoneOTPService(req.body);
    createSendToken(user, 200, res);
});

/** Resends a phone-verification OTP for an unverified account. */
export const resendOTP = AsyncHandler(async (req, res) => {
    await resendOTPService(req.body);
    res.status(200).json({
        status: "success",
        message: "تم إعادة إرسال رمز التحقق إلى رقم الواتساب",
    });
});
