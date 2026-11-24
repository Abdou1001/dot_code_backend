import express from "express";
import {
    adminLogin,
    login,
    logout,
} from "../controller/auth/login.controller.js";
import {
    register,
} from "../controller/auth/register.controller.js";
import {
    resendOTP,
    verifyPhoneOTP,
} from "../controller/auth/otp.controller.js";
import {getMe} from "../controller/auth/account.controller.js";
import {
    changePhoneNumber,
    resendChangePhoneOTP,
    verifyChangePhoneNumber,
} from "../controller/auth/phone.controller.js";
import {
    forgetPassword,
    resetPassword,
    verifyPasswordResetCode,
} from "../controller/auth/password.controller.js";
import {
    loginSchema,
    registerSchema,
    forgotPasswordSchema,
    verifyPasswordResetCodeSchema,
    resetPasswordSchema,
    verifyPhoneOTPSchema,
    changePhoneNumberSchema,
    verifyChangePhoneNumberSchema,
} from "../validations/auth.validation.js";
import {validate} from "../middlewares/validation.middleware.js";
import {
    authRateLimit,
    otpRateLimit,
} from "../middlewares/rateLimit.middleware.js";
import {protect} from "../middlewares/auth.middleware.js";

// api/auth/{router}

const router = express.Router();

// Login
router.post("/login", authRateLimit, validate(loginSchema), login);
// Login
router.post("/adminlogin", authRateLimit, validate(loginSchema), adminLogin);

// Register
router.post("/register", authRateLimit, validate(registerSchema), register);

// Verify Phone
router.post(
    "/verify-phone",
    authRateLimit,
    validate(verifyPhoneOTPSchema),
    verifyPhoneOTP,
);

// Resend OTP
router.post("/resend-otp", otpRateLimit, resendOTP);

// Logout
router.post("/logout", logout);

router.get("/me", protect, getMe);

// Change Phone Number
router.post(
    "/change-phone",
    protect,
    authRateLimit,
    validate(changePhoneNumberSchema),
    changePhoneNumber,
);

router.post(
    "/verify-change-phone",
    protect,
    authRateLimit,
    validate(verifyChangePhoneNumberSchema),
    verifyChangePhoneNumber,
);

router.post(
    "/resend-change-phone-otp",
    protect,
    otpRateLimit,
    resendChangePhoneOTP,
);

// Forget Password
router.post(
    "/forget-password",
    otpRateLimit,
    validate(forgotPasswordSchema),
    forgetPassword,
);

router.post(
    "/verify-reset-code",
    authRateLimit,
    validate(verifyPasswordResetCodeSchema),
    verifyPasswordResetCode,
);

router.post(
    "/reset-password",
    authRateLimit,
    validate(resetPasswordSchema),
    resetPassword,
);
export default router;
