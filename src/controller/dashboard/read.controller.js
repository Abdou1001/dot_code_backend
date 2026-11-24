import AsyncHandler from "express-async-handler";
import {
    appointmentsChart as appointmentsChartService,
    statisticsDashboard as statisticsDashboardService,
} from "../../services/dashboard/read.service.js";

/**
 * Get dashboard statistics.
 *
 * @route GET /api/dashboard/statistics
 * @access Private (Admin)
 */
export const statisticsDashboard = AsyncHandler(async (req, res) => {
    const {message, results} = await statisticsDashboardService();

    res.status(200).json({
        status: "success",
        message,
        results,
    });
});

/**
 * Get monthly appointment chart data.
 *
 * @route GET /api/dashboard/appointments-chart
 * @access Private (Admin)
 */
export const appointmentsChart = AsyncHandler(async (req, res) => {
    const {message, year, results, statistics} = await appointmentsChartService(
        req.query.year,
    );

    res.status(200).json({
        status: "success",
        message,
        year,
        results,
        statistics,
    });
});
