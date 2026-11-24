import AsyncHandler from "express-async-handler";
import {
    deleteAd as deleteAdService,
    insertAd as insertAdService,
    toggleAdStatus as toggleAdStatusService,
    updateAd as updateAdService,
} from "../../services/ads/management.service.js";

/**
 * Create a new advertisement.
 *
 * @route POST /api/ads
 * @access Private (Admin)
 */
export const insertAd = AsyncHandler(async (req, res) => {
    const ad = await insertAdService(req.body, req.file);

    res.status(201).json({
        status: "success",
        message: "تم إضافة الإعلان بنجاح",
        results: ad,
    });
});

/**
 * Update an existing advertisement.
 *
 * @route PUT /api/ads/:id
 * @access Private (Admin)
 */
export const updateAd = AsyncHandler(async (req, res) => {
    const ad = await updateAdService(req.params.id, req.body, req.file);

    res.status(200).json({
        status: "success",
        message: "تم تعديل الإعلان بنجاح",
        results: ad,
    });
});

/**
 * Delete an advertisement.
 *
 * @route DELETE /api/ads/:id
 * @access Private (Admin)
 */
export const deleteAd = AsyncHandler(async (req, res) => {
    await deleteAdService(req.params.id);

    res.status(200).json({
        status: "success",
        message: "تم حذف الإعلان بنجاح",
    });
});

/**
 * Toggle an advertisement's active state.
 *
 * @route PATCH /api/ads/:id/status
 * @access Private (Admin)
 */
export const toggleAdStatus = AsyncHandler(async (req, res) => {
    const ad = await toggleAdStatusService(req.params.id);
    const message = `تم ${ad.status === "active" ? "تفعيل" : "إيقاف"} الإعلان بنجاح`;

    res.status(200).json({
        status: "success",
        message,
        results: ad,
    });
});
