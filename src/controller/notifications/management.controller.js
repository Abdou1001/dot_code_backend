import AsyncHandler from "express-async-handler";
import {
    deleteAllNotifications as deleteAllNotificationsService,
    deleteNotification as deleteNotificationService,
    markAllNotificationsAsRead as markAllNotificationsAsReadService,
    markNotificationAsRead as markNotificationAsReadService,
} from "../../services/notifications/management.service.js";

/**
 * Mark one notification as read for the requesting device.
 *
 * @route PATCH /api/notifications/:id/read
 * @access Public
 */
export const markNotificationAsRead = AsyncHandler(async (req, res) => {
    const read = await markNotificationAsReadService(
        req.params.id,
        req.user?.user_id || null,
        req.headers["x-device-id"],
    );

    res.status(200).json({
        status: "success",
        message: "تم تحديد الإشعار كمقروء",
        results: read,
    });
});

/**
 * Mark all notifications as read for the requesting device.
 *
 * @route PATCH /api/notifications/read-all
 * @access Public
 */
export const markAllNotificationsAsRead = AsyncHandler(async (req, res) => {
    const updated = await markAllNotificationsAsReadService(
        req.user?.user_id || null,
        req.headers["x-device-id"],
    );

    res.status(200).json({
        status: "success",
        message: updated
            ? "تم تحديد جميع الإشعارات كمقروءة"
            : "لا توجد إشعارات لتحديدها كمقروءة",
    });
});

/**
 * Hide one notification for the requesting device.
 *
 * @route DELETE /api/notifications/:id
 * @access Public
 */
export const deleteNotification = AsyncHandler(async (req, res) => {
    const notification = await deleteNotificationService(
        req.params.id,
        req.user?.user_id || null,
        req.headers["x-device-id"],
    );

    res.status(200).json({
        status: "success",
        message: "تم حذف الإشعار بنجاح",
        results: notification,
    });
});

/**
 * Hide all notifications for the requesting device.
 *
 * @route DELETE /api/notifications
 * @access Public
 */
export const deleteAllNotifications = AsyncHandler(async (req, res) => {
    const deleted = await deleteAllNotificationsService(
        req.user?.user_id || null,
        req.headers["x-device-id"],
    );

    res.status(200).json({
        status: "success",
        message: deleted
            ? "تم حذف جميع الإشعارات بنجاح"
            : "لا توجد إشعارات لحذفها",
    });
});
