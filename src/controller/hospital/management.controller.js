import AsyncHandler from "express-async-handler";
import {updateHospitalInfo as updateHospitalInfoService} from "../../services/hospital/management.service.js";

/**
 * Update hospital information.
 *
 * @route PUT /api/hospital
 * @access Private (Admin)
 */
export const updateHospitalInfo = AsyncHandler(async (req, res) => {
    const hospital = await updateHospitalInfoService(req.body, req.file);

    res.status(200).json({
        status: "success",
        message: "تم تحديث بيانات المستشفى بنجاح",
        results: hospital,
    });
});
