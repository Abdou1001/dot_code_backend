import {
    forgetPassword as forgetPasswordService,
    resetPassword as resetPasswordService,
    verifyPasswordResetCode as verifyPasswordResetCodeService,
} from "../../services/auth/auth.service.js";

/** Sends a password-reset OTP to a verified account. */
export const forgetPassword = forgetPasswordService;

/** Verifies the submitted password-reset OTP. */
export const verifyPasswordResetCode = verifyPasswordResetCodeService;

/** Sets a new password after reset-code verification. */
export const resetPassword = resetPasswordService;
