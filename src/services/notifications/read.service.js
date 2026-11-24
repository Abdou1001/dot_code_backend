import {supabase} from "../../config/supabase.js";
import ApiError from "../../utils/ApiError.js";
import {paginationResult} from "../../utils/pagination.js";

/**
 * Retrieves notifications visible to a device and their read state.
 *
 * @param {number|null} userId - Authenticated user ID, when available.
 * @param {string|undefined} deviceId - Device identifier header.
 * @param {object} queryParams - Pagination query parameters.
 * @returns {Promise<{pagination: object, unreadCount: number, results: object[]}>}
 */
export const getNotifications = async (userId, deviceId, queryParams) => {
    if (!deviceId) {
        throw new ApiError("Device ID مطلوب", 400);
    }

    const page = queryParams.page * 1 || 1;
    const limit = queryParams.limit * 1 || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    let notificationsQuery = supabase
        .from("notifications")
        .select("*", {count: "exact"})
        .is("user_id", null)
        .order("created_at", {ascending: false})
        .range(from, to);

    if (userId) {
        notificationsQuery = supabase
            .from("notifications")
            .select("*", {count: "exact"})
            .or(`user_id.eq.${userId},user_id.is.null`)
            .order("created_at", {ascending: false})
            .range(from, to);
    }

    const {data: notifications, error: notificationsError, count} =
        await notificationsQuery;

    if (notificationsError) {
        throw new ApiError("حدث خطأ أثناء جلب الإشعارات", 500);
    }

    const notificationIds =
        notifications?.map((notification) => notification.notification_id) || [];
    let reads = [];

    if (notificationIds.length > 0) {
        const {data, error: readsError} = await supabase
            .from("notification_reads")
            .select("notification_id, read_at, is_deleted")
            .eq("device_id", deviceId)
            .in("notification_id", notificationIds);

        if (readsError) {
            throw new ApiError("حدث خطأ أثناء جلب حالة قراءة الإشعارات", 500);
        }

        reads = data || [];
    }

    const readMap = new Map(reads.map((read) => [read.notification_id, read]));
    const results =
        notifications
            ?.map((notification) => {
                const read = readMap.get(notification.notification_id);

                return {
                    ...notification,
                    is_read: !!read,
                    read_at: read?.read_at || null,
                };
            })
            .filter((notification) => {
                const read = readMap.get(notification.notification_id);
                return !read?.is_deleted;
            }) || [];

    return {
        pagination: paginationResult(page, limit, count),
        unreadCount: results.filter((notification) => !notification.is_read).length,
        results,
    };
};

/**
 * Retrieves one notification visible to a device and its read state.
 *
 * @param {string} id - Notification ID.
 * @param {number|null} userId - Authenticated user ID, when available.
 * @param {string|undefined} deviceId - Device identifier header.
 * @returns {Promise<object>} Notification result.
 */
export const getOneNotification = async (id, userId, deviceId) => {
    if (!deviceId) {
        throw new ApiError("Device ID مطلوب", 400);
    }

    let query = supabase
        .from("notifications")
        .select("*")
        .eq("notification_id", id)
        .is("user_id", null);

    if (userId) {
        query = supabase
            .from("notifications")
            .select("*")
            .eq("notification_id", id)
            .or(`user_id.eq.${userId},user_id.is.null`);
    }

    const {data: notification, error} = await query.maybeSingle();

    if (error || !notification) {
        throw new ApiError("الإشعار غير موجود", 404);
    }

    const {data: read, error: readError} = await supabase
        .from("notification_reads")
        .select("read_at, is_deleted")
        .eq("notification_id", id)
        .eq("device_id", deviceId)
        .maybeSingle();

    if (readError) {
        throw new ApiError("حدث خطأ أثناء جلب حالة الإشعار", 500);
    }

    if (read?.is_deleted) {
        throw new ApiError("الإشعار غير موجود", 404);
    }

    return {
        ...notification,
        is_read: !!read,
        read_at: read?.read_at || null,
    };
};
