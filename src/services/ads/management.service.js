import {supabase} from "../../config/supabase.js";
import {CACHE_KEYS} from "../../config/cache.js";
import {STORAGE_BUCKETS} from "../../config/storage.js";
import ApiError from "../../utils/ApiError.js";
import {deleteImage, getPublicImageUrl} from "../storage.service.js";
import {
    replaceImage,
    rollbackUploadedImage,
    uploadAndProcessImage,
} from "../imageUpload.service.js";
import {deleteByPattern, deleteCache} from "../cache.service.js";
import {sendNotificationToAll} from "../notification.service.js";

/** Clears every cached representation affected by an advertisement mutation. */
const invalidateAdCache = async (id) => {
    await deleteByPattern("ads:*");

    if (id) {
        await deleteCache(CACHE_KEYS.AD(id));
    }

    await deleteCache(CACHE_KEYS.DASHBOARD);
};

/**
 * Creates an advertisement and uploads its image.
 * Rolls back a newly uploaded image if creation fails.
 *
 * @param {object} adData - Advertisement dates.
 * @param {object} file - Uploaded image file.
 * @returns {Promise<object>} Created advertisement with a public image URL.
 */
export const insertAd = async ({start_date, end_date}, file) => {
    let path_image = null;

    try {
        path_image = await uploadAndProcessImage(STORAGE_BUCKETS.ADS, file);

        const {data: ad, error} = await supabase
            .from("ads")
            .insert({
                path_image,
                start_date,
                end_date,
                created_at: new Date(),
                status: "active",
            })
            .select("*")
            .single();

        if (error) {
            throw new ApiError("حدث خطأ أثناء إضافة الإعلان", 400);
        }

        await invalidateAdCache();
        ad.image_url = getPublicImageUrl(STORAGE_BUCKETS.ADS, ad.path_image);

        // Notification delivery must not undo a successfully created advertisement.
        try {
            await sendNotificationToAll({
                title: "إعلان جديد 🎉",
                message: "تمت إضافة إعلان جديد، اكتشفه الآن",
                type: "ad",
                data: {
                    ad_id: ad.ad_id,
                },
            });
        } catch (error) {
            console.error("Failed to send ad notification:", error);
        }

        return ad;
    } catch (error) {
        await rollbackUploadedImage(STORAGE_BUCKETS.ADS, path_image);
        throw error;
    }
};

/**
 * Updates an advertisement and replaces its image when a new file is supplied.
 *
 * @param {string} id - Advertisement ID.
 * @param {object} adData - Updated advertisement values.
 * @param {object} file - Optional replacement image.
 * @returns {Promise<object>} Updated advertisement with a public image URL.
 */
export const updateAd = async (id, {start_date, end_date, status}, file) => {
    const {data: currentAd, error: currentError} = await supabase
        .from("ads")
        .select("ad_id, path_image")
        .eq("ad_id", id)
        .single();

    if (!currentAd || currentError) {
        throw new ApiError("الإعلان غير موجود", 404);
    }

    const ad = await replaceImage({
        bucket: STORAGE_BUCKETS.ADS,
        currentImage: currentAd.path_image,
        file,
        action: async (path_image) => {
            const {data, error} = await supabase
                .from("ads")
                .update({
                    path_image,
                    start_date,
                    end_date,
                    status,
                })
                .eq("ad_id", id)
                .select("*")
                .single();

            if (!data || error) {
                throw new ApiError("حدث خطأ أثناء تعديل الإعلان", 400);
            }

            return data;
        },
    });

    await invalidateAdCache(id);
    ad.image_url = getPublicImageUrl(STORAGE_BUCKETS.ADS, ad.path_image);

    return ad;
};

/**
 * Deletes an advertisement and its stored image.
 *
 * @param {string} id - Advertisement ID.
 * @returns {Promise<void>}
 */
export const deleteAd = async (id) => {
    const {data: ad, error} = await supabase
        .from("ads")
        .select("path_image")
        .eq("ad_id", id)
        .single();

    if (!ad || error) {
        throw new ApiError("الإعلان غير موجود", 404);
    }

    const {error: errorDelete} = await supabase
        .from("ads")
        .delete()
        .eq("ad_id", id);

    if (errorDelete) {
        throw new ApiError("فشل حذف الإعلان", 500);
    }

    await invalidateAdCache(id);
    await deleteImage(STORAGE_BUCKETS.ADS, ad.path_image);
};

/**
 * Switches an advertisement between active and inactive states.
 *
 * @param {string} id - Advertisement ID.
 * @returns {Promise<object>} Updated advertisement with a public image URL.
 */
export const toggleAdStatus = async (id) => {
    const {data: ad, error} = await supabase
        .from("ads")
        .select("ad_id, status")
        .eq("ad_id", id)
        .single();

    if (!ad || error) {
        throw new ApiError("الإعلان غير موجود", 404);
    }

    const newStatus = ad.status === "active" ? "inactive" : "active";
    const {data: updatedAd, error: updateError} = await supabase
        .from("ads")
        .update({
            status: newStatus,
        })
        .eq("ad_id", id)
        .select("*")
        .single();

    if (!updatedAd || updateError) {
        throw new ApiError("حدث خطأ أثناء تغيير حالة الإعلان", 400);
    }

    await invalidateAdCache(id);
    updatedAd.image_url = getPublicImageUrl(
        STORAGE_BUCKETS.ADS,
        updatedAd.path_image,
    );

    return updatedAd;
};
