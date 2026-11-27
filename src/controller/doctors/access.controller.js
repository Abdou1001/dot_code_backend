import AsyncHandler from "express-async-handler";
import {paginate, paginationResult} from "../../utils/pagination.js";
import {getMyDoctorProfile as getMyDoctorProfileService} from "../../services/doctors/access.service.js";
import {getDoctorAppointments} from "../../services/appointments/read.service.js";
import {getDoctorSchedulesForUser} from "../../services/doctorsSchedules/read.service.js";

/**
 * Returns the professional profile linked to the authenticated doctor account.
 *
 * Uses the user ID established by authentication and never accepts a doctor
 * identifier from the request for this protected profile lookup.
 *
 * @route GET /api/doctors/me
 * @access Private (Doctor)
 * @param {object} req - Express request containing the authenticated user.
 * @param {object} res - Express response used for the profile payload.
 * @returns {Promise<void>} A successful doctor-profile response.
 */
export const getMyDoctorProfile = AsyncHandler(async (req, res) => {
    const doctor = await getMyDoctorProfileService(req.user.user_id);

    res.status(200).json({
        status: "success",
        message: "تم جلب بيانات الطبيب بنجاح",
        results: doctor,
    });
});

/**
 * Returns appointments belonging only to the authenticated doctor.
 *
 * Converts query pagination into service arguments while deriving the doctor
 * identity exclusively from the authenticated account.
 *
 * @route GET /api/doctors/me/appointments
 * @access Private (Doctor)
 * @param {object} req - Express request containing filters and authenticated user.
 * @param {object} res - Express response used for the appointment payload.
 * @returns {Promise<void>} A paginated doctor-appointments response.
 */
export const getMyDoctorAppointments = AsyncHandler(async (req, res) => {
    const {page, limit, from, to} = paginate(req);
    const {appointments, count} = await getDoctorAppointments({
        userId: req.user.user_id,
        page,
        limit,
        from,
        to,
        queryParams: req.query,
    });

    res.status(200).json({
        status: "success",
        message: "تم جلب حجوزات الطبيب بنجاح",
        pagination: paginationResult(page, limit, count),
        results: appointments,
    });
});

/**
 * Returns schedules belonging only to the authenticated doctor.
 *
 * Resolves schedule ownership through the authenticated user's linked doctor
 * record so a supplied route parameter cannot alter the result.
 *
 * @route GET /api/doctors/me/schedules
 * @access Private (Doctor)
 * @param {object} req - Express request containing the authenticated user.
 * @param {object} res - Express response used for the schedules payload.
 * @returns {Promise<void>} A successful doctor-schedules response.
 */
export const getMyDoctorSchedules = AsyncHandler(async (req, res) => {
    const {message, results} = await getDoctorSchedulesForUser(
        req.user.user_id,
    );

    res.status(200).json({
        status: "success",
        message,
        results,
    });
});
