import {
    adminLogin as adminLoginService,
    createSendToken as createSendTokenService,
    getMe as getMeService,
    login as loginService,
    logout as logoutService,
} from "../../services/auth/auth.service.js";

/** Creates the authentication cookie and successful login response. */
export const createSendToken = createSendTokenService;

/** Authenticates a user with email or phone credentials. */
export const login = loginService;

/** Authenticates an administrator for dashboard access. */
export const adminLogin = adminLoginService;

/** Clears the authentication cookie for the current session. */
export const logout = logoutService;

/** Returns the authenticated user's profile details. */
export const getMe = getMeService;
