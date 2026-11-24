import AsyncHandler from "express-async-handler";
import {
    getDepartmentsInfo as getDepartmentsInfoService,
    getOneDepartmentInfo as getOneDepartmentInfoService,
} from "../../services/departments/read.service.js";

/**
 * Get departments with pagination, keyword filtering, and sorting.
 *
 * @route GET /api/departments
 * @access Public
 */
export const getDepartmentsInfo = AsyncHandler(async (req, res) => {
    const {message, pagination, results} = await getDepartmentsInfoService(
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
 * Get one department by ID.
 *
 * @route GET /api/departments/:id
 * @access Public
 */
export const getOneDepartmentInfo = AsyncHandler(async (req, res) => {
    const {message, results} = await getOneDepartmentInfoService(req.params.id);

    res.status(200).json({
        status: "success",
        message,
        results,
    });
});
