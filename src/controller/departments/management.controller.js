import AsyncHandler from "express-async-handler";
import {
    deleteDepartment as deleteDepartmentService,
    insertDepartment as insertDepartmentService,
    updatetDepartment as updatetDepartmentService,
} from "../../services/departments/management.service.js";

/**
 * Create a new department.
 *
 * @route POST /api/departments
 * @access Private (Admin)
 */
export const insertDepartment = AsyncHandler(async (req, res) => {
    const department = await insertDepartmentService(req.body, req.file);

    res.status(201).json({
        status: "success",
        message: "تم اضافة القسم بنجاح",
        results: department,
    });
});

/**
 * Update an existing department.
 *
 * @route PUT /api/departments/:id
 * @access Private (Admin)
 */
export const updatetDepartment = AsyncHandler(async (req, res) => {
    const department = await updatetDepartmentService(
        req.params.id,
        req.body,
        req.file,
    );

    res.status(200).json({
        status: "success",
        message: "تم تعديل القسم بنجاح",
        results: department,
    });
});

/**
 * Delete a department.
 *
 * @route DELETE /api/departments/:id
 * @access Private (Admin)
 */
export const deleteDepartment = AsyncHandler(async (req, res) => {
    const department = await deleteDepartmentService(req.params.id);

    res.status(200).json({
        status: "success",
        message: "تم حذف القسم بنجاح",
        results: department,
    });
});
