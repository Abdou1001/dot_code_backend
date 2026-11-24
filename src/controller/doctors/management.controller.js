import AsyncHandler from "express-async-handler";
import {
    changeDoctorStatus as changeDoctorStatusService,
    insertDoctor as insertDoctorService,
    toggleDoctorVisibility as toggleDoctorVisibilityService,
    updateDoctor as updateDoctorService,
} from "../../services/doctors/management.service.js";

/**
 * Create a doctor with department relationships and schedules.
 *
 * @route POST /api/doctors
 * @access Private (Admin)
 */
export const insertDoctor = AsyncHandler(async (req, res) => {
    const doctor = await insertDoctorService(req.body, req.file);

    res.status(201).json({
        status: "success",
        message: "تم اضافة الطبيب بنجاح",
        results: doctor,
    });
});

/**
 * Update a doctor with department relationships and schedules.
 *
 * @route PUT /api/doctors/:id
 * @access Private (Admin)
 */
export const updateDoctor = AsyncHandler(async (req, res) => {
    const doctor = await updateDoctorService(
        req.params.id,
        req.body,
        req.file,
    );

    res.status(200).json({
        status: "success",
        message: "تم تعديل الطبيب بنجاح",
        results: doctor,
    });
});

/**
 * Toggle a doctor's booking status.
 *
 * @route PATCH /api/doctors/:id/status
 * @access Private (Admin)
 */
export const changeDoctorStatus = AsyncHandler(async (req, res) => {
    const doctor = await changeDoctorStatusService(req.params.id);

    res.status(200).json({
        status: "success",
        message: "تم تغيير حالة الطبيب بنجاح",
        results: doctor,
    });
});

/**
 * Toggle a doctor's visibility.
 *
 * @route PATCH /api/doctors/:id/is_hidden
 * @access Private (Admin)
 */
export const toggleDoctorVisibility = AsyncHandler(async (req, res) => {
    const doctor = await toggleDoctorVisibilityService(req.params.id);

    res.status(200).json({
        status: "success",
        message: "تم التغيير الطبيب بنجاح",
        results: doctor,
    });
});
