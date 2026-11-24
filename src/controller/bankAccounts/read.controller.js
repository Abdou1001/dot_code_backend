import AsyncHandler from "express-async-handler";
import {
    getBankAccountsInfo as getBankAccountsInfoService,
    getOneBankAccountInfo as getOneBankAccountInfoService,
} from "../../services/bankAccounts/read.service.js";

/**
 * Get all bank accounts.
 *
 * @route GET /api/bank-accounts
 * @access Public
 */
export const getBankAccountsInfo = AsyncHandler(async (req, res) => {
    const {message, results} = await getBankAccountsInfoService();

    res.status(200).json({
        status: "success",
        message,
        results,
    });
});

/**
 * Get one bank account by ID.
 *
 * @route GET /api/bank-accounts/:id
 * @access Private (Admin)
 */
export const getOneBankAccountInfo = AsyncHandler(async (req, res) => {
    const {message, results} = await getOneBankAccountInfoService(req.params.id);

    res.status(200).json({
        status: "success",
        message,
        results,
    });
});
