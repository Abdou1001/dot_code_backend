import {getMe as getMeService} from "../../services/auth/account.service.js";
import AsyncHandler from "express-async-handler";

/** Returns the authenticated user's profile details. */
export const getMe = AsyncHandler(async (req, res) => {
    const user = await getMeService(req.user.user_id);
    res.status(200).json({
        status: "success",
        message: "تم جلب بيانات المستخدم بنجاح",
        user,
    });
});
