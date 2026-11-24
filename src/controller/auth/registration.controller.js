import {
    register as registerService,
    resendOTP as resendOTPService,
    verifyPhoneOTP as verifyPhoneOTPService,
} from "../../services/auth/auth.service.js";

/** Registers a user and initiates phone verification. */
export const register = registerService;

/** Verifies the phone OTP and signs in the verified user. */
export const verifyPhoneOTP = verifyPhoneOTPService;

/** Resends a phone-verification OTP for an unverified account. */
export const resendOTP = resendOTPService;
