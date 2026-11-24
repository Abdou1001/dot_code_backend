import {supabase} from "../../config/supabase.js";
import {CACHE_KEYS, CACHE_TTL} from "../../config/cache.js";
import {getPublicImageUrl} from "../storage.service.js";
import {getCache, setCache} from "../cache.service.js";
import {STORAGE_BUCKETS} from "../../config/storage.js";
import ApiError from "../../utils/ApiError.js";
import {paginationResult} from "../../utils/pagination.js";

/**
 * Retrieves paginated advertisements, including cache, filters, and image URLs.
 *
 * @param {object} queryParams - Advertisement query parameters.
 * @returns {Promise<{message: string, pagination: object, results: object[]}>}
 */
export const getAdsInfo = async (queryParams) => {
    const page = queryParams.page * 1 || 1;
    const limit = queryParams.limit * 1 || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const {keyword, status, expired, sort = "-created_at"} = queryParams;
    const today = new Date().toISOString().split("T")[0];
    const cacheKey = `ads:page=${page}:limit=${limit}:keyword=${
        keyword || "all"
    }:status=${status || "all"}:expired=${expired || "all"}:sort=${sort}`;

    // Return cached records after converting stored image names to public URLs.
    const cachedAds = await getCache(cacheKey);

    if (cachedAds) {
        cachedAds.results.forEach((ad) => {
            ad.image_url = getPublicImageUrl(
                STORAGE_BUCKETS.ADS,
                ad.path_image,
            );
        });

        return {
            message: "تم جلب البيانات من Redis",
            pagination: cachedAds.pagination,
            results: cachedAds.results,
        };
    }

    let query = supabase.from("ads").select("*", {count: "exact"});

    if (keyword) {
        query = query.or(
            `start_date.ilike.%${keyword}%,end_date.ilike.%${keyword}%`,
        );
    }

    if (status) {
        query = query.eq("status", status);
    }

    if (expired === "true") {
        query = query.lt("end_date", today);
    }

    if (expired === "false") {
        query = query.gte("end_date", today);
    }

    query = query.order(sort.startsWith("-") ? sort.substring(1) : sort, {
        ascending: !sort.startsWith("-"),
    });

    const {data: ads, error, count} = await query.range(from, to);

    if (error || !ads) {
        throw new ApiError("حدث خطأ أثناء جلب الإعلانات", 500);
    }

    const pagination = paginationResult(page, limit, count);

    // Cache raw image names so URLs remain valid when the storage host changes.
    await setCache(
        cacheKey,
        {
            pagination,
            results: ads,
        },
        CACHE_TTL.ADS,
    );

    ads.forEach((ad) => {
        ad.image_url = getPublicImageUrl(STORAGE_BUCKETS.ADS, ad.path_image);
    });

    return {
        message: "تم جلب الإعلانات بنجاح",
        pagination,
        results: ads,
    };
};

/**
 * Retrieves one advertisement, using its individual cache entry when available.
 *
 * @param {string} id - Advertisement ID.
 * @returns {Promise<{message: string, results: object}>}
 */
export const getOneAdInfo = async (id) => {
    const cacheKey = CACHE_KEYS.AD(id);
    const cachedAd = await getCache(cacheKey);

    if (cachedAd) {
        cachedAd.image_url = getPublicImageUrl(
            STORAGE_BUCKETS.ADS,
            cachedAd.path_image,
        );

        return {
            message: "تم جلب البيانات من Redis",
            results: cachedAd,
        };
    }

    const {data: ad, error} = await supabase
        .from("ads")
        .select("*")
        .eq("ad_id", id)
        .single();

    if (!ad || error) {
        throw new ApiError("الإعلان غير موجود", 404);
    }

    await setCache(cacheKey, ad, CACHE_TTL.ADS);
    ad.image_url = getPublicImageUrl(STORAGE_BUCKETS.ADS, ad.path_image);

    return {
        message: "تم جلب الإعلان بنجاح",
        results: ad,
    };
};
