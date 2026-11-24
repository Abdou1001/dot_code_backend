import jwt from "jsonwebtoken";

/**
 * Generate a signed JWT token.
 *
 * @param {object} payload - User ID and role.
 * @returns {string} Signed JWT.
 */
const createToken = (payload) => {
    return jwt.sign(payload, process.env.SECRET_KEY_JWT, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

/**
 * Create an authentication cookie and send the login response.
 *
 * @param {object} user - Authenticated user record.
 * @param {number} statusCode - HTTP status code.
 * @param {object} res - Express response object.
 */
export const createSendToken = (user, statusCode, res) => {
    // 1. Generate authentication token
    const token = createToken({
        user_id: user.user_id,
        role: user.role,
    });

    // 2. Remove password from the response
    delete user.password;

    // 3. Set authentication cookie
    res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 4. Return the authenticated user
    res.status(statusCode).json({
        status: "success",
        message: "تم تسجيل الدخول بنجاح",
        user,
    });
};
