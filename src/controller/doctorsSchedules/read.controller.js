import AsyncHandler from "express-async-handler";
import {
    getDoctorSchedulesInfo as getDoctorSchedulesInfoService,
    getDoctorsSchedulesInfo as getDoctorsSchedulesInfoService,
} from "../../services/doctorsSchedules/read.service.js";

/**
 * Get schedules with filters, pagination, and doctor-name search.
 *
 * @route GET /api/doctor-schedules
 * @access Public
 */
export const getDoctorsSchedulesInfo = AsyncHandler(async (req, res) => {
    const {message, pagination, results, count} =
        await getDoctorsSchedulesInfoService(req.query);

    res.status(200).json({
        status: "success",
        message,
        pagination,
        results,
        count,
    });
});

/**
 * Get all schedules belonging to one doctor.
 *
 * @route GET /api/doctor-schedules/:id
 * @access Public
 */
export const getDoctorSchedulesInfo = AsyncHandler(async (req, res) => {
    const {message, results} = await getDoctorSchedulesInfoService(req.params.id);

    res.status(200).json({
        status: "success",
        message,
        results,
    });
});
