import {supabase} from "../../config/supabase.js";
import {CACHE_KEYS} from "../../config/cache.js";
import {STORAGE_BUCKETS} from "../../config/storage.js";
import ApiError from "../../utils/ApiError.js";
import {deleteCache} from "../cache.service.js";
import {getPublicImageUrl} from "../storage.service.js";
import {
    replaceImage,
    rollbackUploadedImage,
    uploadAndProcessImage,
} from "../imageUpload.service.js";

/**
 * Creates a bank account and uploads its image.
 * Rolls back a newly uploaded image when account creation fails.
 *
 * @param {object} accountData - Bank account fields.
 * @param {object} file - Uploaded bank account image.
 * @returns {Promise<object>} Created bank account with a public image URL.
 */
export const insertBankAccount = async ({name, account_number}, file) => {
    let path_image = null;

    try {
        path_image = await uploadAndProcessImage(
            STORAGE_BUCKETS.BANK_ACCOUNTS,
            file,
        );

        const {data: account, error} = await supabase
            .from("bank_accounts")
            .insert({
                name,
                account_number,
                path_image,
                is_active: true,
            })
            .select("*")
            .single();

        if (error) {
            throw new ApiError("حدث خطأ أثناء إضافة الحساب البنكي", 400);
        }

        await deleteCache(CACHE_KEYS.BANK_ACCOUNTS);
        account.path_image = getPublicImageUrl(
            STORAGE_BUCKETS.BANK_ACCOUNTS,
            account.path_image,
        );

        return account;
    } catch (error) {
        await rollbackUploadedImage(STORAGE_BUCKETS.BANK_ACCOUNTS, path_image);
        throw error;
    }
};

/**
 * Updates a bank account and replaces its image when a new file is supplied.
 *
 * @param {string} id - Bank account ID.
 * @param {object} accountData - Updated bank account fields.
 * @param {object} file - Optional replacement image.
 * @returns {Promise<object>} Updated bank account with a public image URL.
 */
export const updateBankAccount = async (
    id,
    {name, account_number},
    file,
) => {
    const {data: oldAccount, error: getError} = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("bank_account_id", id)
        .single();

    if (getError || !oldAccount) {
        throw new ApiError("الحساب البنكي غير موجود", 404);
    }

    const account = await replaceImage({
        bucket: STORAGE_BUCKETS.BANK_ACCOUNTS,
        currentImage: oldAccount.path_image,
        file,
        action: async (path_image) => {
            const {data, error} = await supabase
                .from("bank_accounts")
                .update({
                    name,
                    account_number,
                    path_image,
                })
                .eq("bank_account_id", id)
                .select("*")
                .single();

            if (error || !data) {
                throw new ApiError("حدث خطأ أثناء تعديل الحساب البنكي", 400);
            }

            return data;
        },
    });

    await deleteCache(CACHE_KEYS.BANK_ACCOUNTS);
    await deleteCache(CACHE_KEYS.BANK_ACCOUNT(id));

    account.path_image = getPublicImageUrl(
        STORAGE_BUCKETS.BANK_ACCOUNTS,
        account.path_image,
    );

    return account;
};

/**
 * Toggles a bank account's active state.
 *
 * @param {string} id - Bank account ID.
 * @returns {Promise<object>} Updated bank account.
 */
export const toggleBankAccountStatus = async (id) => {
    const {data: account, error: getError} = await supabase
        .from("bank_accounts")
        .select("is_active")
        .eq("bank_account_id", id)
        .single();

    if (getError || !account) {
        throw new ApiError("الحساب البنكي غير موجود", 404);
    }

    const newStatus = !account.is_active;
    const {data: updatedAccount, error} = await supabase
        .from("bank_accounts")
        .update({
            is_active: newStatus,
            updated_at: new Date().toISOString(),
        })
        .eq("bank_account_id", id)
        .select("*")
        .single();

    if (error || !updatedAccount) {
        throw new ApiError("حدث خطأ أثناء تغيير حالة الحساب البنكي", 400);
    }

    await deleteCache(CACHE_KEYS.BANK_ACCOUNTS);
    await deleteCache(CACHE_KEYS.BANK_ACCOUNT(id));

    return updatedAccount;
};

/**
 * Deletes a bank account, its stored image, and related cache entries.
 *
 * @param {string} id - Bank account ID.
 * @returns {Promise<void>}
 */
export const deleteBankAccount = async (id) => {
    const {data: account, error: getError} = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("bank_account_id", id)
        .single();

    if (getError || !account) {
        throw new ApiError("الحساب البنكي غير موجود", 404);
    }

    const {error: deleteError} = await supabase
        .from("bank_accounts")
        .delete()
        .eq("bank_account_id", id);

    if (deleteError) {
        throw new ApiError("حدث خطأ أثناء حذف الحساب البنكي", 500);
    }

    // Preserve the original non-blocking image-deletion behavior.
    if (account.path_image) {
        const {error: imageError} = await supabase.storage
            .from(STORAGE_BUCKETS.BANK_ACCOUNTS)
            .remove([account.path_image]);

        if (imageError) {
            console.error("Failed to delete bank account image:", imageError);
        }
    }

    await deleteCache(CACHE_KEYS.BANK_ACCOUNTS);
    await deleteCache(CACHE_KEYS.BANK_ACCOUNT(id));
};
