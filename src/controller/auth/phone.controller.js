import {
    changePhoneNumber as changePhoneNumberService,
    resendChangePhoneOTP as resendChangePhoneOTPService,
    verifyChangePhoneNumber as verifyChangePhoneNumberService,
} from "../../services/auth/phone.service.js";
import AsyncHandler from "express-async-handler";

/** Starts the authenticated user's phone-number change flow. */
export const changePhoneNumber = AsyncHandler(async (req, res) => {
    await changePhoneNumberService({
        userId: req.user.user_id,
        ...req.body,
    });
    res.status(200).json({
        status: "success",
        message: "تم إرسال رمز التحقق إلى رقم الهاتف الجديد",
    });
});

/** Verifies the OTP for a pending phone-number change. */
export const verifyChangePhoneNumber = AsyncHandler(async (req, res) => {
    await verifyChangePhoneNumberService({
        userId: req.user.user_id,
        ...req.body,
    });
    res.status(200).json({
        status: "success",
        message: "تم تغيير رقم الهاتف بنجاح",
    });
});

/** Resends the OTP for a pending phone-number change. */
export const resendChangePhoneOTP = AsyncHandler(async (req, res) => {
    await resendChangePhoneOTPService({
        userId: req.user.user_id,
    });
    res.status(200).json({
        status: "success",
        message: "تم إعادة إرسال رمز التحقق",
    });
});
