import AsyncHandler from "express-async-handler";
import {
    getDoctorsInfo as getDoctorsInfoService,
    getOneDoctorInfo as getOneDoctorInfoService,
} from "../../services/doctors/read.service.js";

/**
 * Get doctors with pagination, search, filters, and sorting.
 *
 * @route GET /api/doctors
 * @access Public
 */
export const getDoctorsInfo = AsyncHandler(async (req, res) => {
    const {message, pagination, results} = await getDoctorsInfoService(
        req.query,
    );

    res.status(200).json({
        status: "success",
        message,
        pagination,
        results,
    });
});

/**
 * Get one doctor by ID.
 *
 * @route GET /api/doctors/:id
 * @access Public
 */
export const getOneDoctorInfo = AsyncHandler(async (req, res) => {
    const {message, results} = await getOneDoctorInfoService(req.params.id);

    res.status(200).json({
        status: "success",
        message,
        results,
    });
});
