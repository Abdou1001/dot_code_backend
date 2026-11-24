import {
    adminLogin as adminLoginService,
    login as loginService,
} from "../../services/auth/login.service.js";
import AsyncHandler from "express-async-handler";
import {createSendToken} from "../../services/auth/auth.helpers.js";

/** Authenticates a user with email or phone credentials. */
export const login = AsyncHandler(async (req, res) => {
    const user = await loginService(req.body);
    createSendToken(user, 200, res);
});

/** Authenticates an administrator for dashboard access. */
export const adminLogin = AsyncHandler(async (req, res) => {
    const user = await adminLoginService(req.body);
    createSendToken(user, 200, res);
});

/** Clears the authentication cookie for the current session. */
/**
 * @desc    Log out user and clear authentication cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
export const logout = AsyncHandler(async (req, res) => {
    // Remove JWT authentication cookie
    res.clearCookie("token", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
    });

    res.status(200).json({
        status: "success",
        message: "تم تسجيل الخروج بنجاح",
    });
});

