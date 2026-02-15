import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  createTransaction as createTransactionService,
  fetchTransactions as fetchTransactionsService,
  fetchTransaction as fetchTransactionService,
  updateTransaction as updateTransactionService,
  deleteTransaction as deleteTransactionService,
} from "../services/transaction.service.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  validateCreateTransaction,
  validateFetchTransactions,
  validateTransactionIdQuery,
  validateUpdateTransaction,
} from "../validators/transaction.validation.js";

/**
 * GET /transactions
 * - With query.id: returns a single transaction by id (must belong to user).
 * - Without id: returns list of user's transactions (optional filters: account_id, category_id, type, date_from, date_to).
 */
const getTransactions = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;
  const transactionId = req.query.id;

  if (transactionId !== undefined && transactionId !== "") {
    const queryValidation = validateTransactionIdQuery({ id: req.query.id });
    if (queryValidation.error) {
      const errorMessages = queryValidation.error.details.map((d) => d.message).join(", ");
      throw new ApiError(400, `Validation error: ${errorMessages}`);
    }
    const transaction = await fetchTransactionService(userId, queryValidation.value.id);
    return res.status(200).json(new ApiResponse(200, transaction, "Transaction fetched successfully"));
  }

  const { error, value } = validateFetchTransactions(req.query);
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  const transactions = await fetchTransactionsService(userId, value);
  return res.status(200).json(new ApiResponse(200, transactions, "Transactions fetched successfully"));
});

/**
 * POST /transactions
 * Create a transaction. Snapshot (base_currency, amount_base_minor, fx_rate_id) is computed and stored.
 * Body: account_id, category_id, amount_minor, type; optional: currency, source, description, metadata, timestamp.
 */
const createTransaction = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  if (
    req.body == null ||
    typeof req.body !== "object" ||
    Array.isArray(req.body) ||
    Object.keys(req.body).length === 0
  ) {
    throw new ApiError(400, "Request body is required. Use JSON or x-www-form-urlencoded.");
  }

  const { error, value } = validateCreateTransaction(req.body);
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  const transaction = await createTransactionService(userId, value);
  return res.status(201).json(new ApiResponse(201, transaction, "Transaction created successfully"));
});

/**
 * PATCH /transactions?id=<transaction_id>
 * Update transaction (description, metadata, source, category_id, timestamp only). Only owner can update.
 */
const updateTransaction = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const queryValidation = validateTransactionIdQuery({ id: req.query.id });
  if (queryValidation.error) {
    const errorMessages = queryValidation.error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }
  const transactionId = queryValidation.value.id;

  if (
    req.body == null ||
    typeof req.body !== "object" ||
    Array.isArray(req.body) ||
    Object.keys(req.body).length === 0
  ) {
    throw new ApiError(400, "Request body is required. Use JSON or x-www-form-urlencoded.");
  }

  const { error, value } = validateUpdateTransaction(req.body);
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  const transaction = await updateTransactionService(userId, transactionId, value);
  return res.status(200).json(new ApiResponse(200, transaction, "Transaction updated successfully"));
});

/**
 * DELETE /transactions?id=<transaction_id>
 * Soft-delete transaction and reverse account balance. Only owner can delete.
 */
const deleteTransaction = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const { error, value } = validateTransactionIdQuery({ id: req.query.id });
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  await deleteTransactionService(userId, value.id);
  return res.status(200).json(new ApiResponse(200, null, "Transaction deleted successfully"));
});

export { getTransactions, createTransaction, updateTransaction, deleteTransaction };
