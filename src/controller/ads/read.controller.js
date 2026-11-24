import AsyncHandler from "express-async-handler";
import {
    getAdsInfo as getAdsInfoService,
    getOneAdInfo as getOneAdInfoService,
} from "../../services/ads/read.service.js";

/**
 * Get advertisements with pagination, filters, search, and sorting.
 *
 * @route GET /api/ads
 * @access Public
 */
export const getAdsInfo = AsyncHandler(async (req, res) => {
    const {message, pagination, results} = await getAdsInfoService(req.query);

    res.status(200).json({
        status: "success",
        message,
        pagination,
        results,
    });
});

/**
 * Get one advertisement by ID.
 *
 * @route GET /api/ads/:id
 * @access Public
 */
export const getOneAdInfo = AsyncHandler(async (req, res) => {
    const {message, results} = await getOneAdInfoService(req.params.id);

    res.status(200).json({
        status: "success",
        message,
        results,
    });
});
