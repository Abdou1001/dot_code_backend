import AsyncHandler from "express-async-handler";
import {
    getNotifications as getNotificationsService,
    getOneNotification as getOneNotificationService,
} from "../../services/notifications/read.service.js";

/**
 * Get notifications visible to the requesting device.
 *
 * @route GET /api/notifications
 * @access Public
 */
export const getNotifications = AsyncHandler(async (req, res) => {
    const {pagination, unreadCount, results} = await getNotificationsService(
        req.user?.user_id || null,
        req.headers["x-device-id"],
        req.query,
    );

    res.status(200).json({
        status: "success",
        message: "تم جلب الإشعارات بنجاح",
        pagination,
        unread_count: unreadCount,
        results,
    });
});

/**
 * Get one notification visible to the requesting device.
 *
 * @route GET /api/notifications/:id
 * @access Public
 */
export const getOneNotification = AsyncHandler(async (req, res) => {
    const notification = await getOneNotificationService(
        req.params.id,
        req.user?.user_id || null,
        req.headers["x-device-id"],
    );

    res.status(200).json({
        status: "success",
        message: "تم جلب الإشعار بنجاح",
        results: notification,
    });
});
