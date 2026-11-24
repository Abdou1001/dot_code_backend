import AsyncHandler from "express-async-handler";
import {
    assignDoctorToDepartment as assignDoctorToDepartmentService,
    deleteDoctorFromDepartment as deleteDoctorFromDepartmentService,
    updateDoctorDepartment as updateDoctorDepartmentService,
} from "../../services/doctorDepartments/management.service.js";

/**
 * Assign a doctor to a department.
 *
 * @route POST /api/doctor-departments
 * @access Private (Admin)
 */
export const assignDoctorToDepartment = AsyncHandler(async (req, res) => {
    const relation = await assignDoctorToDepartmentService(req.body);

    res.status(201).json({
        status: "success",
        message: "تم ربط الدكتور بالقسم بنجاح",
        results: relation,
    });
});

/**
 * Update a doctor-department relationship.
 *
 * @route PUT /api/doctor-departments/:id
 * @access Private (Admin)
 */
export const updateDoctorDepartment = AsyncHandler(async (req, res) => {
    const relation = await updateDoctorDepartmentService(req.params.id, req.body);

    res.status(200).json({
        status: "success",
        message: "تم تعديل العلاقة بنجاح",
        results: relation,
    });
});

/**
 * Delete a doctor-department relationship.
 *
 * @route DELETE /api/doctor-departments/:id
 * @access Private (Admin)
 */
export const deleteDoctorFromDepartment = AsyncHandler(async (req, res) => {
    const relation = await deleteDoctorFromDepartmentService(req.params.id);

    res.status(200).json({
        status: "success",
        message: "تم حذف العلاقة بنجاح",
        results: relation,
    });
});
