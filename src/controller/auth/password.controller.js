import {
    forgetPassword as forgetPasswordService,
    resetPassword as resetPasswordService,
    verifyPasswordResetCode as verifyPasswordResetCodeService,
} from "../../services/auth/password.service.js";
import AsyncHandler from "express-async-handler";

/** Sends a password-reset OTP to a verified account. */
export const forgetPassword = AsyncHandler(async (req, res) => {
    await forgetPasswordService(req.body);
    res.status(200).json({
        status: "success",
        message: "تم إرسال رمز التحقق إلى رقم الواتساب الخاص بك",
    });
});

/** Verifies the submitted password-reset OTP. */
export const verifyPasswordResetCode = AsyncHandler(async (req, res) => {
    await verifyPasswordResetCodeService(req.body);
    res.status(200).json({
        status: "success",
        message: "تم التحقق من رمز الاستعادة بنجاح",
    });
});

/** Sets a new password after reset-code verification. */
export const resetPassword = AsyncHandler(async (req, res) => {
    await resetPasswordService(req.body);
    res.status(200).json({
        status: "success",
        message: "تم تغيير كلمة المرور بنجاح",
    });
});
