import AsyncHandler from "express-async-handler";
import {
    getDepartmentsByDoctor as getDepartmentsByDoctorService,
    getDoctorDepartmentsInfo as getDoctorDepartmentsInfoService,
    getDoctorsByDepartment as getDoctorsByDepartmentService,
    getOneDoctorDepartmentInfo as getOneDoctorDepartmentInfoService,
} from "../../services/doctorDepartments/read.service.js";

/**
 * Get doctor-department relationships with pagination and keyword search.
 *
 * @route GET /api/doctor-departments
 * @access Public
 */
export const getDoctorDepartmentsInfo = AsyncHandler(async (req, res) => {
    const {message, pagination, results} = await getDoctorDepartmentsInfoService(
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
 * Get one doctor-department relationship by ID.
 *
 * @route GET /api/doctor-departments/:id
 * @access Private (Admin)
 */
export const getOneDoctorDepartmentInfo = AsyncHandler(async (req, res) => {
    const {message, results} = await getOneDoctorDepartmentInfoService(
        req.params.id,
    );

    res.status(200).json({
        status: "success",
        message,
        results,
    });
});

/**
 * Get doctors assigned to a department.
 *
 * @route GET /api/doctor-departments/department/:id
 * @access Public
 */
export const getDoctorsByDepartment = AsyncHandler(async (req, res) => {
    const {message, results} = await getDoctorsByDepartmentService(
        req.params.id,
    );

    res.status(200).json({
        status: "success",
        message,
        results,
    });
});

/**
 * Get departments assigned to a doctor.
 *
 * @route GET /api/doctor-departments/doctor/:id
 * @access Public
 */
export const getDepartmentsByDoctor = AsyncHandler(async (req, res) => {
    const {message, results} = await getDepartmentsByDoctorService(
        req.params.id,
    );

    res.status(200).json({
        status: "success",
        message,
        results,
    });
});
