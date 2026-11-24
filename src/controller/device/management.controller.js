import AsyncHandler from "express-async-handler";
import {
    registerDevice as registerDeviceService,
    removeDevice as removeDeviceService,
} from "../../services/device/management.service.js";

/**
 * Register a user or guest device.
 *
 * @route POST /api/devices
 * @access Public
 */
export const registerDevice = AsyncHandler(async (req, res) => {
    const {created, device} = await registerDeviceService(
        req.user?.user_id || null,
        req.body,
    );

    res.status(created ? 201 : 200).json({
        status: "success",
        message: created ? "تم تسجيل الجهاز بنجاح" : "تم تحديث الجهاز بنجاح",
        results: device,
    });
});

/**
 * Remove a user or guest device.
 *
 * @route DELETE /api/devices
 * @access Public
 */
export const removeDevice = AsyncHandler(async (req, res) => {
    const device = await removeDeviceService(req.user?.user_id || null, req.body);

    res.status(200).json({
        status: "success",
        message: "تم حذف الجهاز بنجاح",
        results: device,
    });
});
