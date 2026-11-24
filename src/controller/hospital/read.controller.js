import AsyncHandler from "express-async-handler";
import {getHospitalInfo as getHospitalInfoService} from "../../services/hospital/read.service.js";

/**
 * Get hospital information.
 *
 * @route GET /api/hospital
 * @access Public
 */
export const getHospitalInfo = AsyncHandler(async (req, res) => {
    const {message, results} = await getHospitalInfoService();

    res.status(200).json({
        status: "success",
        message,
        results,
    });
});
