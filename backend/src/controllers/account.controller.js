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
 * Returns paginated accounts for the user.
 * Optional query filters: type, is_active, q, page, limit, sort_by, sort_order.
 */
const getAccounts = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const { error, value } = validateFetchAccounts(req.query);
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  const accounts = await fetchAccountsService(userId, value);
  return res.status(200).json(new ApiResponse(200, accounts, "Accounts fetched successfully"));
});

/**
 * GET /accounts/:id
 * Returns a single account by id (must belong to user).
 */
const getAccount = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const { error, value } = validateAccountIdQuery({ id: req.params.id });
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  const account = await fetchAccountService(userId, value.id);
  return res.status(200).json(new ApiResponse(200, account, "Account fetched successfully"));
});

/**
 * POST /accounts
 * Creates a new account.
 * Body: { name, type, currency_code, ...optional metadata fields }.
 * currency_code must exist in Currency model.
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
 * PATCH /accounts/:id
 * Updates a user-owned account. Body accepts account fields from update validator (at least one required).
 */
const updateAccount = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const paramValidation = validateAccountIdQuery({ id: req.params.id });
  if (paramValidation.error) {
    const errorMessages = paramValidation.error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }
  const accountId = paramValidation.value.id;

  const { error, value } = validateUpdateAccount(req.body);
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  const updatedAccount = await updateAccountService(userId, accountId, value);
  return res.status(200).json(new ApiResponse(200, updatedAccount, "Account updated successfully"));
});

/**
 * DELETE /accounts/:id
 * Deletes an account. Only allowed when account has no transactions; otherwise 409 (suggest deactivate).
 */
const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const { error, value } = validateAccountIdQuery({ id: req.params.id });
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  await deleteAccountService(userId, value.id);
  return res.status(200).json(new ApiResponse(200, null, "Account deleted successfully"));
});

export { getAccounts, getAccount, createAccount, updateAccount, deleteAccount };
