import AsyncHandler from "express-async-handler";
import {
    cancelUserAppointment,
    changeAppointmentStatus,
} from "../../services/appointments/status.service.js";

// @Desc Change appointment status
// @Route PATCH : /api/appointments/:id/status
// @Access Private (Admin, Reception)
export const changeAppointmentsStatus = AsyncHandler(async (req, res) => {
    const appointment = await changeAppointmentStatus({
        id: req.params.id,
        ...req.body,
        user: req.user,
    });

    res.status(200).json({
        status: "success",
        message: "تم تحديث حالة الحجز بنجاح",
        results: appointment,
    });
});

// @Desc Cancel my appointment
// @Route PATCH : /api/appointments/:id/cancel
// @Access Private (User)
export const cancelAppointment = AsyncHandler(async (req, res) => {
    const appointment = await cancelUserAppointment({
        id: req.params.id,
        userId: req.user.user_id,
        user: req.user,
    });

    res.status(200).json({
        status: "success",
        message: "تم إلغاء الحجز بنجاح",
        results: appointment,
    });
});
