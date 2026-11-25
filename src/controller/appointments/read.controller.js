import AsyncHandler from "express-async-handler";
import {paginate, paginationResult} from "../../utils/pagination.js";
import {
    getAppointment,
    getAppointments,
    getPendingAppointmentsForReception,
    getUserAppointments,
} from "../../services/appointments/read.service.js";

// @Desc Get all appointments with pagination, search, filters and sorting
// @Route GET : /api/appointments
// @Access Private (Admin, Reception)
export const getAppointmentsInfo = AsyncHandler(async (req, res) => {
    const {page, limit, from, to} = paginate(req);
    const {appointments, count} = await getAppointments({
        page,
        limit,
        from,
        to,
        queryParams: req.query,
        user: req.user,
    });

    res.status(200).json({
        status: "success",
        message: "تم جلب الحجوزات بنجاح",
        pagination: paginationResult(page, limit, count),
        results: appointments,
    });
});

// @Desc Get one appointment
// @Route GET : /api/appointments/:id
// @Access Private (Admin, Reception)
export const getOneAppointmentInfo = AsyncHandler(async (req, res) => {
    const appointment = await getAppointment(req.params.id, req.user);
    res.status(200).json({
        status: "success",
        message: "تم جلب الحجز بنجاح",
        results: appointment,
    });
});

// @Desc Get my appointments
// @Route GET : /api/appointments/my-appointments
// @Access Private (User)
export const getMyAppointments = AsyncHandler(async (req, res) => {
    const {page, limit, from, to} = paginate(req);
    const {appointments, count} = await getUserAppointments({
        userId: req.user.user_id,
        page,
        limit,
        from,
        to,
        queryParams: req.query,
        user: req.user,
    });

    res.status(200).json({
        status: "success",
        message: "تم جلب الحجوزات بنجاح",
        pagination: paginationResult(page, limit, count),
        results: appointments,
    });
});

// @Desc Get pending appointments for Reception
// @Route GET : /api/appointments/pending
// @Access Private (Admin, Reception)
export const getPendingAppointments = AsyncHandler(async (req, res) => {
    const {appointments, count} = await getPendingAppointmentsForReception(
        req.query.keyword || "",
        req.user,
    );

    res.status(200).json({
        status: "success",
        message: "تم جلب الحجوزات المعلقة بنجاح",
        count,
        results: appointments,
    });
});
