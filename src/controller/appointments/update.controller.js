import AsyncHandler from "express-async-handler";
import {updateUserAppointment} from "../../services/appointments/update.service.js";

// @Desc Update my appointment
// @Route PUT : /api/appointments/:id
// @Access Private (User)
export const updateAppointment = AsyncHandler(async (req, res) => {
    const appointment = await updateUserAppointment({
        id: req.params.id,
        userId: req.user.user_id,
        body: req.body,
        file: req.file,
    });

    res.status(200).json({
        status: "success",
        message: "تم تعديل الحجز بنجاح",
        results: appointment,
    });
});
