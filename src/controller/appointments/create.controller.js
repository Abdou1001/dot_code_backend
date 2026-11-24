import AsyncHandler from "express-async-handler";
import {createAppointmentForUser} from "../../services/appointments/create.service.js";

// @Desc Create new appointment
// @Route POST : /api/appointments
// @Access Private (User)
export const createAppointment = AsyncHandler(async (req, res) => {
    const appointment = await createAppointmentForUser({
        body: req.body,
        userId: req.user.user_id,
        file: req.file,
    });

    res.status(201).json({
        status: "success",
        message:
            "تم إرسال طلب الحجز بنجاح، انتظر حتى يتم تاكد الحجز من الاستقبال",
        results: appointment,
    });
});
