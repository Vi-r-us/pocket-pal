import handleServerError from "../utils/handleServerError.js";
import logger from "../utils/logger.js";
import ApiError from "../utils/ApiError.js";
import { Op } from "sequelize";
import { Account, Category, Currency, FXRate, Transaction, User } from "../models/index.js";
import { getOrFetchRate } from "./fx.service.js";
import { sanitizeDate } from "../utils/sanitize.js";

/**
 * Resolve base currency for a user: user.base_currency if set and valid, else account.currency_code.
 */
async function resolveBaseCurrency(userId, accountCurrencyCode) {
  const user = await User.findByPk(userId, { attributes: ["user_id", "base_currency"] });
  if (user?.base_currency) {
    const exists = await Currency.findByPk(user.base_currency);
    if (exists) return user.base_currency;
  }
  return accountCurrencyCode;
}

/**
 * Compute amount in base currency minor units: amount_minor (in from currency) * rate, with minor_unit scaling.
 */
function computeAmountBaseMinor(amountMinor, rate, fromMinorUnit, baseMinorUnit) {
  const fromScale = Math.pow(10, fromMinorUnit);
  const baseScale = Math.pow(10, baseMinorUnit);
  return Math.round((Number(amountMinor) * Number(rate) * baseScale) / fromScale);
}

/**
 * Create a transaction and store snapshot (base_currency, amount_base_minor, fx_rate_id). Updates account balance.
 */
async function createTransaction(userId, data) {
  logger.info({ userId, data }, "createTransaction called");

  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }

  try {
    const account = await Account.findOne({
      where: { account_id: data.account_id, user_id: userId },
    });
    if (!account) {
      throw new ApiError(404, "Account not found");
    }

    const category = await Category.findOne({
      where: {
        category_id: data.category_id,
        [Op.or]: [{ user_id: null }, { user_id: userId }],
      },
    });
    if (!category) {
      throw new ApiError(404, "Category not found");
    }

    const currency = (data.currency || account.currency_code).toString().toUpperCase();
    const currencyExists = await Currency.findByPk(currency);
    if (!currencyExists) {
      throw new ApiError(400, "Invalid currency code");
    }

    const baseCurrency = await resolveBaseCurrency(userId, account.currency_code);
    const asOfDate = data.timestamp
      ? new Date(data.timestamp).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const fxRate = await getOrFetchRate(currency, baseCurrency, asOfDate);

    const fromCurrencyRow = await Currency.findByPk(currency);
    const baseCurrencyRow = await Currency.findByPk(baseCurrency);
    const amountBaseMinor = computeAmountBaseMinor(
      data.amount_minor,
      fxRate.rate,
      fromCurrencyRow.minor_unit,
      baseCurrencyRow.minor_unit
    );

    const transaction = await Transaction.create({
      user_id: userId,
      account_id: data.account_id,
      category_id: data.category_id,
      amount_minor: data.amount_minor,
      currency,
      base_currency: baseCurrency,
      amount_base_minor: amountBaseMinor,
      fx_rate_id: fxRate.fx_rate_id,
      type: data.type,
      source: data.source || "manual",
      description: data.description ?? "",
      metadata: data.metadata ?? null,
      timestamp: data.timestamp || new Date(),
    });

    const balanceDelta = data.type === "withdrawal" ? -Number(data.amount_minor) : Number(data.amount_minor);
    await account.increment("balance_minor", { by: balanceDelta });

    logger.info({ userId, transactionId: transaction.transaction_id }, "Transaction created");
    return transaction;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw handleServerError(err, "Error creating transaction", 500);
  }
}

const accountInclude = { model: Account, as: "account", attributes: ["account_id", "name", "currency_code"] };
const fxRateInclude = { model: FXRate, as: "fxRate", attributes: ["fx_rate_id", "rate", "as_of_date", "source"] };
const categoryInclude = { model: Category, as: "category", attributes: ["category_id", "name", "type"] };

/**
 * List transactions for the user with optional filters. Order by timestamp DESC.
 */
async function fetchTransactions(userId, params = {}) {
  const { account_id, category_id, type, source, date_from, date_to } = params || {};
  logger.info({ userId, params }, "fetchTransactions called");

  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }

  try {
    const where = { user_id: userId };
    if (account_id != null) where.account_id = account_id;
    if (category_id != null) where.category_id = category_id;
    if (type != null && type !== "") where.type = type;
    if (source != null && source !== "") where.source = source;

    if (date_from != null || date_to != null) {
      where.timestamp = {};
      if (date_from != null) {
        const startOfDay = new Date(date_from);
        startOfDay.setUTCHours(0, 0, 0, 0);
        where.timestamp[Op.gte] = sanitizeDate(startOfDay);
      }
      if (date_to != null) {
        const endOfDay = new Date(date_to);
        endOfDay.setUTCHours(23, 59, 59, 999);
        where.timestamp[Op.lte] = sanitizeDate(endOfDay);
      }
    }

    console.log("where", where);

    const transactions = await Transaction.findAll({
      where,
      include: [accountInclude, fxRateInclude],
      order: [["timestamp", "DESC"]],
    });
    
    logger.info({ userId, count: transactions.length }, "Transactions fetched");
    return transactions || [];
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw handleServerError(err, "Error fetching transactions", 500);
  }
}

/**
 * Get one transaction by id (must belong to user).
 */
async function fetchTransaction(userId, transactionId) {
  logger.info({ userId, transactionId }, "fetchTransaction called");

  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }
  if (transactionId === undefined || transactionId === null || transactionId === "") {
    throw new ApiError(400, "Transaction ID is required");
  }

  try {
    const transaction = await Transaction.findOne({
      where: { transaction_id: transactionId, user_id: userId },
      include: [accountInclude, fxRateInclude, categoryInclude],
    });
    if (!transaction) {
      throw new ApiError(404, "Transaction not found");
    }
    return transaction;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw handleServerError(err, "Error fetching transaction", 500);
  }
}

/**
 * Update transaction (only safe fields). Only owner can update.
 */
async function updateTransaction(userId, transactionId, data) {
  logger.info({ userId, transactionId, data }, "updateTransaction called");

  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }
  if (transactionId === undefined || transactionId === null || transactionId === "") {
    throw new ApiError(400, "Transaction ID is required");
  }

  try {
    const transaction = await Transaction.findOne({
      where: { transaction_id: transactionId, user_id: userId },
    });
    if (!transaction) {
      throw new ApiError(404, "Transaction not found");
    }

    if (data.category_id !== undefined) {
      const category = await Category.findOne({
        where: {
          category_id: data.category_id,
          [Op.or]: [{ user_id: null }, { user_id: userId }],
        },
      });
      if (!category) {
        throw new ApiError(404, "Category not found");
      }
    }

    const allowed = {};
    if (data.description !== undefined) allowed.description = data.description;
    if (data.metadata !== undefined) allowed.metadata = data.metadata;
    if (data.source !== undefined) allowed.source = data.source;
    if (data.category_id !== undefined) allowed.category_id = data.category_id;
    if (data.timestamp !== undefined) allowed.timestamp = data.timestamp;

    await transaction.update(allowed);
    logger.info({ userId, transactionId }, "Transaction updated");
    return transaction;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw handleServerError(err, "Error updating transaction", 500);
  }
}

/**
 * Soft-delete transaction and reverse account balance.
 */
async function deleteTransaction(userId, transactionId) {
  logger.info({ userId, transactionId }, "deleteTransaction called");

  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }
  if (transactionId === undefined || transactionId === null || transactionId === "") {
    throw new ApiError(400, "Transaction ID is required");
  }

  try {
    const transaction = await Transaction.findOne({
      where: { transaction_id: transactionId, user_id: userId },
    });
    if (!transaction) {
      throw new ApiError(404, "Transaction not found");
    }

    const account = await Account.findByPk(transaction.account_id);
    if (account) {
      const reverseDelta = transaction.type === "withdrawal" ? Number(transaction.amount_minor) : -Number(transaction.amount_minor);
      await account.increment("balance_minor", { by: reverseDelta });
    }

    await transaction.destroy();
    logger.info({ userId, transactionId }, "Transaction deleted");
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw handleServerError(err, "Error deleting transaction", 500);
  }
}

export {
  createTransaction,
  fetchTransactions,
  fetchTransaction,
  updateTransaction,
  deleteTransaction,
  resolveBaseCurrency,
  computeAmountBaseMinor,
};
