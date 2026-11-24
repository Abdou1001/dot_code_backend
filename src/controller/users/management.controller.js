import AsyncHandler from "express-async-handler";
import {
    changeMyPassword as changeMyPasswordService,
    changeUserRole as changeUserRoleService,
    changeUserStatus as changeUserStatusService,
    updateMyProfile as updateMyProfileService,
    updateUser as updateUserService,
} from "../../services/users/management.service.js";

/**
 * Update a user from the administration routes.
 *
 * @route PUT /api/users/:id
 * @access Private (Admin)
 */
export const updateUser = AsyncHandler(async (req, res) => {
    const user = await updateUserService(req.params.id, req.body);

    res.status(200).json({
        status: "success",
        message: "تم تعديل البيانات بنجاح",
        results: user,
    });
});

/**
 * Toggle a user's account status.
 *
 * @route PATCH /api/users/:id/status
 * @access Private (Admin)
 */
export const changeUserStatus = AsyncHandler(async (req, res) => {
    const user = await changeUserStatusService(req.params.id, req.user.user_id);

    res.status(200).json({
        status: "success",
        message: "تم تعديل حالة المتسخدم بنجاح",
        results: user,
    });
});

/**
 * Change a user's role.
 *
 * @route PATCH /api/users/:id/role
 * @access Private (Admin)
 */
export const changeUserRole = AsyncHandler(async (req, res) => {
    const user = await changeUserRoleService(
        req.params.id,
        req.body.role,
        req.user.user_id,
    );

    res.status(200).json({
        status: "success",
        message: "تم تعديل دور المستخدم بنجاح",
        results: user,
    });
});

/**
 * Update the authenticated user's profile.
 *
 * @route PUT /api/users/profile
 * @access Private
 */
export const updateMyProfile = AsyncHandler(async (req, res) => {
    const user = await updateMyProfileService(req.user.user_id, req.body);

    res.status(200).json({
        status: "success",
        message: "تم تحديث الملف الشخصي بنجاح",
        results: user,
    });
});

/**
 * Change the authenticated user's password.
 *
 * @route PATCH /api/users/change-password
 * @access Private
 */
export const changeMyPassword = AsyncHandler(async (req, res) => {
    await changeMyPasswordService(req.user.user_id, req.body);

    res.status(200).json({
        status: "success",
        message: "تم تغيير كلمة المرور بنجاح",
    });
});
