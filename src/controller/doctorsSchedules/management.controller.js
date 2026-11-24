import AsyncHandler from "express-async-handler";
import {
    assignDoctorsSchedules as assignDoctorsSchedulesService,
    changeDoctorScheduleStatus as changeDoctorScheduleStatusService,
    deleteDoctorsSchedules as deleteDoctorsSchedulesService,
    updateDoctorsSchedules as updateDoctorsSchedulesService,
} from "../../services/doctorsSchedules/management.service.js";

/**
 * Create a doctor schedule.
 *
 * @route POST /api/doctor-schedules
 * @access Private (Admin)
 */
export const assignDoctorsSchedules = AsyncHandler(async (req, res) => {
    const schedule = await assignDoctorsSchedulesService(req.body);

    res.status(201).json({
        status: "success",
        message: "تم إضافة دوام الطبيب بنجاح",
        results: schedule,
    });
});

/**
 * Update a doctor schedule.
 *
 * @route PUT /api/doctor-schedules/:id
 * @access Private (Admin)
 */
export const updateDoctorsSchedules = AsyncHandler(async (req, res) => {
    const schedule = await updateDoctorsSchedulesService(req.params.id, req.body);

    res.status(200).json({
        status: "success",
        message: "تم تحديث الدوام بنجاح",
        results: schedule,
    });
});

/**
 * Delete a doctor schedule.
 *
 * @route DELETE /api/doctor-schedules/:id
 * @access Private (Admin)
 */
export const deleteDoctorsSchedules = AsyncHandler(async (req, res) => {
    const schedule = await deleteDoctorsSchedulesService(req.params.id);

    res.status(200).json({
        status: "success",
        message: "تم حذف الدوام بنجاح",
        results: schedule,
    });
});

/**
 * Toggle a doctor schedule's status.
 *
 * @route PATCH /api/doctor-schedules/status/:id
 * @access Private (Admin)
 */
export const changeDoctorScheduleStatus = AsyncHandler(async (req, res) => {
    const schedule = await changeDoctorScheduleStatusService(req.params.id);

    res.status(200).json({
        status: "success",
        message:
            schedule.status === "active"
                ? "تم تفعيل الدوام بنجاح"
                : "تم إيقاف الدوام بنجاح",
        results: schedule,
    });
});
