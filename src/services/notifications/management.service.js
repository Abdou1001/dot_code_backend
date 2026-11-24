import {supabase} from "../../config/supabase.js";
import ApiError from "../../utils/ApiError.js";

/** Marks one accessible notification as read for the current device. */
export const markNotificationAsRead = async (id, userId, deviceId) => {
    if (!deviceId) throw new ApiError("Device ID مطلوب", 400);

    let query = supabase
        .from("notifications")
        .select("notification_id")
        .eq("notification_id", id)
        .is("user_id", null);

    if (userId) {
        query = supabase
            .from("notifications")
            .select("notification_id")
            .eq("notification_id", id)
            .or(`user_id.eq.${userId},user_id.is.null`);
    }

    const {data: notification, error: notificationError} =
        await query.maybeSingle();

    if (notificationError || !notification) {
        throw new ApiError("الإشعار غير موجود", 404);
    }

    const {data: read, error} = await supabase
        .from("notification_reads")
        .upsert(
            {
                notification_id: Number(id),
                device_id: Number(deviceId),
                read_at: new Date().toISOString(),
                is_deleted: false,
            },
            {onConflict: "notification_id,device_id"},
        )
        .select("*")
        .single();

    if (error) {
        throw new ApiError("حدث خطأ أثناء تحديد الإشعار كمقروء", 500);
    }

    return read;
};

/** Marks every accessible notification as read for the current device. */
export const markAllNotificationsAsRead = async (userId, deviceId) => {
    if (!deviceId) throw new ApiError("Device ID مطلوب", 400);

    let query = supabase.from("notifications").select("notification_id").is("user_id", null);

    if (userId) {
        query = supabase
            .from("notifications")
            .select("notification_id")
            .or(`user_id.eq.${userId},user_id.is.null`);
    }

    const {data: notifications, error} = await query;

    if (error) throw new ApiError("حدث خطأ أثناء جلب الإشعارات", 500);
    if (!notifications?.length) return false;

    const reads = notifications.map((notification) => ({
        notification_id: notification.notification_id,
        device_id: Number(deviceId),
        read_at: new Date().toISOString(),
        is_deleted: false,
    }));
    const {error: readsError} = await supabase
        .from("notification_reads")
        .upsert(reads, {onConflict: "notification_id,device_id"});

    if (readsError) {
        throw new ApiError("حدث خطأ أثناء تحديد جميع الإشعارات كمقروءة", 500);
    }

    return true;
};

/** Hides one accessible notification for the current device only. */
export const deleteNotification = async (id, userId, deviceId) => {
    if (!deviceId) throw new ApiError("Device ID مطلوب", 400);

    let query = supabase
        .from("notifications")
        .select("notification_id")
        .eq("notification_id", id)
        .is("user_id", null);

    if (userId) {
        query = supabase
            .from("notifications")
            .select("notification_id")
            .eq("notification_id", id)
            .or(`user_id.eq.${userId},user_id.is.null`);
    }

    const {data: notification, error: notificationError} =
        await query.maybeSingle();

    if (notificationError || !notification) {
        throw new ApiError("الإشعار غير موجود", 404);
    }

    const {data: deletedNotification, error} = await supabase
        .from("notification_reads")
        .upsert(
            {
                notification_id: Number(id),
                device_id: Number(deviceId),
                is_deleted: true,
            },
            {onConflict: "notification_id,device_id"},
        )
        .select("*")
        .single();

    if (error) throw new ApiError("حدث خطأ أثناء حذف الإشعار", 500);

    return deletedNotification;
};

/** Hides every accessible notification for the current device only. */
export const deleteAllNotifications = async (userId, deviceId) => {
    if (!deviceId) throw new ApiError("Device ID مطلوب", 400);

    let query = supabase.from("notifications").select("notification_id").is("user_id", null);

    if (userId) {
        query = supabase
            .from("notifications")
            .select("notification_id")
            .or(`user_id.eq.${userId},user_id.is.null`);
    }

    const {data: notifications, error} = await query;

    if (error) throw new ApiError("حدث خطأ أثناء جلب الإشعارات", 500);
    if (!notifications?.length) return false;

    const deletedNotifications = notifications.map((notification) => ({
        notification_id: notification.notification_id,
        device_id: Number(deviceId),
        is_deleted: true,
    }));
    const {error: deleteError} = await supabase
        .from("notification_reads")
        .upsert(deletedNotifications, {onConflict: "notification_id,device_id"});

    if (deleteError) {
        throw new ApiError("حدث خطأ أثناء حذف جميع الإشعارات", 500);
    }

    return true;
};
