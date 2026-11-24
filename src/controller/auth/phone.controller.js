import {
    changePhoneNumber as changePhoneNumberService,
    resendChangePhoneOTP as resendChangePhoneOTPService,
    verifyChangePhoneNumber as verifyChangePhoneNumberService,
} from "../../services/auth/auth.service.js";

/** Starts the authenticated user's phone-number change flow. */
export const changePhoneNumber = changePhoneNumberService;

/** Verifies the OTP for a pending phone-number change. */
export const verifyChangePhoneNumber = verifyChangePhoneNumberService;

/** Resends the OTP for a pending phone-number change. */
export const resendChangePhoneOTP = resendChangePhoneOTPService;
