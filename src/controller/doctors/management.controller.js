import AsyncHandler from "express-async-handler";
import {
    changeDoctorStatus as changeDoctorStatusService,
    insertDoctor as insertDoctorService,
    toggleDoctorVisibility as toggleDoctorVisibilityService,
    updateDoctor as updateDoctorService,
} from "../../services/doctors/management.service.js";

/**
 * Creates a doctor professional record and linked login account.
 *
 * Delegates password hashing, image handling, and the atomic account-aware
 * PostgreSQL operation to the Doctor management service.
 *
 * @route POST /api/doctors
 * @access Private (Admin)
 * @param {object} req - Express request containing validated doctor data and image.
 * @param {object} res - Express response used for the created doctor payload.
 * @returns {Promise<void>} A successful doctor creation response.
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
 * Updates a doctor profile and permitted linked-account information.
 *
 * Keeps protected account credentials out of the request flow and delegates
 * professional, department, and schedule synchronization to the service.
 *
 * @route PUT /api/doctors/:id
 * @access Private (Admin)
 * @param {object} req - Express request containing the doctor ID and update data.
 * @param {object} res - Express response used for the updated doctor payload.
 * @returns {Promise<void>} A successful doctor update response.
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
