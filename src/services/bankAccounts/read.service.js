import {supabase} from "../../config/supabase.js";
import {CACHE_KEYS, CACHE_TTL} from "../../config/cache.js";
import {STORAGE_BUCKETS} from "../../config/storage.js";
import ApiError from "../../utils/ApiError.js";
import {getCache, setCache} from "../cache.service.js";
import {getPublicImageUrl} from "../storage.service.js";

/**
 * Retrieves all bank accounts and converts stored image paths to public URLs.
 *
 * @returns {Promise<{message: string, results: object[]}>} Bank account results.
 */
export const getBankAccountsInfo = async () => {
    const cacheKey = CACHE_KEYS.BANK_ACCOUNTS;
    const cachedBankAccounts = await getCache(cacheKey);

    if (cachedBankAccounts) {
        const results = cachedBankAccounts.map((account) => ({
            ...account,
            path_image: getPublicImageUrl(
                STORAGE_BUCKETS.BANK_ACCOUNTS,
                account.path_image,
            ),
        }));

        return {
            message: "تم جلب الحسابات البنكية من Redis",
            results,
        };
    }

    const {data: bankAccounts, error} = await supabase
        .from("bank_accounts")
        .select("*")
        .order("bank_account_id", {
            ascending: true,
        });

    if (error) {
        throw new ApiError("حدث خطأ أثناء جلب الحسابات البنكية", 500);
    }

    // Cache database values before converting stored paths to public URLs.
    await setCache(cacheKey, bankAccounts, CACHE_TTL.BANK_ACCOUNTS);

    const results = bankAccounts.map((account) => ({
        ...account,
        path_image: getPublicImageUrl(
            STORAGE_BUCKETS.BANK_ACCOUNTS,
            account.path_image,
        ),
    }));

    return {
        message: "تم جلب الحسابات البنكية بنجاح",
        results,
    };
};

/**
 * Retrieves one bank account and converts its stored image path to a public URL.
 *
 * @param {string} id - Bank account ID.
 * @returns {Promise<{message: string, results: object}>} Bank account result.
 */
export const getOneBankAccountInfo = async (id) => {
    const cacheKey = CACHE_KEYS.BANK_ACCOUNT(id);
    const cachedAccount = await getCache(cacheKey);

    if (cachedAccount) {
        const results = {
            ...cachedAccount,
            path_image: getPublicImageUrl(
                STORAGE_BUCKETS.BANK_ACCOUNTS,
                cachedAccount.path_image,
            ),
        };

        return {
            message: "تم جلب الحساب البنكي من Redis",
            results,
        };
    }

    const {data: account, error} = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("bank_account_id", id)
        .single();

    if (error || !account) {
        throw new ApiError("الحساب البنكي غير موجود", 404);
    }

    await setCache(cacheKey, account, CACHE_TTL.BANK_ACCOUNTS);

    const results = {
        ...account,
        path_image: getPublicImageUrl(
            STORAGE_BUCKETS.BANK_ACCOUNTS,
            account.path_image,
        ),
    };

    return {
        message: "تم جلب الحساب البنكي بنجاح",
        results,
    };
};
