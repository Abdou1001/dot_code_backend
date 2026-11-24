import AsyncHandler from "express-async-handler";
import {
    getMyProfile as getMyProfileService,
    getOneUserInfo as getOneUserInfoService,
    getUsersInfo as getUsersInfoService,
} from "../../services/users/read.service.js";

/**
 * Get users with pagination, filtering, search, and sorting.
 *
 * @route GET /api/users
 * @access Private (Admin)
 */
export const getUsersInfo = AsyncHandler(async (req, res) => {
    const {message, pagination, results} = await getUsersInfoService(req.query);

    res.status(200).json({
        status: "success",
        message,
        pagination,
        results,
    });
});

/**
 * Get one user by ID.
 *
 * @route GET /api/users/:id
 * @access Private (Admin)
 */
export const getOneUserInfo = AsyncHandler(async (req, res) => {
    const user = await getOneUserInfoService(req.params.id);

    res.status(200).json({
        status: "success",
        message: "تم جلب البيانات بنجاح",
        results: user,
    });
});

/**
 * Get the authenticated user's profile.
 *
 * @route GET /api/users/profile
 * @access Private
 */
export const getMyProfile = AsyncHandler(async (req, res) => {
    const user = await getMyProfileService(req.user.user_id);

    res.status(200).json({
        status: "success",
        message: "تم جلب البيانات بنجاح",
        results: user,
    });
});
