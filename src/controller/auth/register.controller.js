import {
    register as registerService,
} from "../../services/auth/register.service.js";
import AsyncHandler from "express-async-handler";

/** Registers a user and initiates phone verification. */
export const register = AsyncHandler(async (req, res) => {
    const created = await registerService(req.body);

    if (!created) {
        return res.status(200).json({
            status: "success",
            message: "الحساب غير مفعل، تم إرسال رمز تحقق جديد إلى رقم هاتفك",
        });
    }

    res.status(201).json({
        status: "success",
        message:
            "تم إنشاء الحساب بنجاح، تم إرسال رمز التحقق إلى رقم الواتساب الخاص بك",
    });
});
