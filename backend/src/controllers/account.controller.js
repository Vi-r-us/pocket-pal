import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  fetchAccounts as fetchAccountsService,
  fetchAccount as fetchAccountService,
  createAccount as createAccountService,
  updateAccount as updateAccountService,
  deleteAccount as deleteAccountService,
} from "../services/account.service.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  validateFetchAccounts,
  validateCreateAccount,
  validateUpdateAccount,
  validateAccountIdQuery,
} from "../validators/account.validation.js";

/**
 * GET /accounts
 * - With query.id: returns a single account by id (must belong to user).
 * - Without id: returns all accounts for the user, optionally filtered by query (type, is_active).
 */
const getAccounts = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;
  const accountId = req.query.id;

  if (accountId !== undefined && accountId !== "") {
    const queryValidation = validateAccountIdQuery({ id: req.query.id });
    if (queryValidation.error) {
      const errorMessages = queryValidation.error.details.map((d) => d.message).join(", ");
      throw new ApiError(400, `Validation error: ${errorMessages}`);
    }
    const account = await fetchAccountService(userId, queryValidation.value.id);
    return res.status(200).json(new ApiResponse(200, account, "Account fetched successfully"));
  }

  const { error, value } = validateFetchAccounts(req.query);
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  const accounts = await fetchAccountsService(userId, value);
  return res.status(200).json(new ApiResponse(200, accounts, "Accounts fetched successfully"));
});

/**
 * POST /accounts
 * Creates a new account. Body: { name, type, currency_code }. currency_code must exist in Currency model.
 */
const createAccount = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const { error, value } = validateCreateAccount(req.body);
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  const newAccount = await createAccountService(userId, value);
  return res.status(201).json(new ApiResponse(201, newAccount, "Account created successfully"));
});

/**
 * PATCH /accounts?id=<account_id>
 * Updates a user-owned account. Body: { name?, type?, currency_code?, is_active? } (at least one required).
 */
const updateAccount = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const queryValidation = validateAccountIdQuery({ id: req.query.id });
  if (queryValidation.error) {
    const errorMessages = queryValidation.error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }
  const accountId = queryValidation.value.id;

  const { error, value } = validateUpdateAccount(req.body);
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  const updatedAccount = await updateAccountService(userId, accountId, value);
  return res.status(200).json(new ApiResponse(200, updatedAccount, "Account updated successfully"));
});

/**
 * DELETE /accounts?id=<account_id>
 * Deletes an account. Only allowed when account has no transactions; otherwise 409 (suggest deactivate).
 */
const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const { error, value } = validateAccountIdQuery({ id: req.query.id });
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  await deleteAccountService(userId, value.id);
  return res.status(200).json(new ApiResponse(200, null, "Account deleted successfully"));
});

export { getAccounts, createAccount, updateAccount, deleteAccount };
