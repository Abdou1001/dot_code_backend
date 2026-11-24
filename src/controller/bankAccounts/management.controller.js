import AsyncHandler from "express-async-handler";
import {
    deleteBankAccount as deleteBankAccountService,
    insertBankAccount as insertBankAccountService,
    toggleBankAccountStatus as toggleBankAccountStatusService,
    updateBankAccount as updateBankAccountService,
} from "../../services/bankAccounts/management.service.js";

/**
 * Create a bank account.
 *
 * @route POST /api/bank-accounts
 * @access Private (Admin)
 */
export const insertBankAccount = AsyncHandler(async (req, res) => {
    const account = await insertBankAccountService(req.body, req.file);

    res.status(201).json({
        status: "success",
        message: "تم إضافة الحساب البنكي بنجاح",
        results: account,
    });
});

/**
 * Update an existing bank account.
 *
 * @route PUT /api/bank-accounts/:id
 * @access Private (Admin)
 */
export const updateBankAccount = AsyncHandler(async (req, res) => {
    const account = await updateBankAccountService(
        req.params.id,
        req.body,
        req.file,
    );

    res.status(200).json({
        status: "success",
        message: "تم تعديل الحساب البنكي بنجاح",
        results: account,
    });
});

/**
 * Toggle a bank account's active state.
 *
 * @route PATCH /api/bank-accounts/:id/status
 * @access Private (Admin)
 */
export const toggleBankAccountStatus = AsyncHandler(async (req, res) => {
    const account = await toggleBankAccountStatusService(req.params.id);

    res.status(200).json({
        status: "success",
        message: account.is_active
            ? "تم تفعيل الحساب البنكي"
            : "تم تعطيل الحساب البنكي",
        results: account,
    });
});

/**
 * Delete a bank account.
 *
 * @route DELETE /api/bank-accounts/:id
 * @access Private (Admin)
 */
export const deleteBankAccount = AsyncHandler(async (req, res) => {
    await deleteBankAccountService(req.params.id);

    res.status(200).json({
        status: "success",
        message: "تم حذف الحساب البنكي بنجاح",
    });
});
