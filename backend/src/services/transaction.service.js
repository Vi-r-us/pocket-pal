import handleServerError from "../utils/handleServerError.js";
import logger from "../utils/logger.js";
import ApiError from "../utils/ApiError.js";
import { Op } from "sequelize";
import { Account, Category, CategoryGroup, Currency, FXRate, Transaction, User } from "../models/index.js";
import { getOrFetchRate } from "./fx.service.js";
import { sanitizeDate } from "../utils/sanitize.js";
import { TRANSACTION_TYPE_NORMALIZATION_MAP } from "../constants/constants.js";

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

function normalizeTransactionType(type) {
  const normalized = TRANSACTION_TYPE_NORMALIZATION_MAP[String(type || "").toLowerCase()];
  return normalized || type;
}

function getExpenseLikeTypes() {
  return ["expense", "withdrawal"];
}

function getTypeWhereClause(type) {
  const normalizedType = normalizeTransactionType(type);
  if (!normalizedType) return undefined;
  if (normalizedType === "income") return { [Op.in]: ["income", "deposit"] };
  if (normalizedType === "expense") return { [Op.in]: getExpenseLikeTypes() };
  return normalizedType;
}

function getBalanceDelta(type, amountMinor) {
  const normalizedType = normalizeTransactionType(type);
  const amount = Number(amountMinor) || 0;
  return normalizedType === "expense" ? -amount : amount;
}

function buildTransactionsWhere(userId, params = {}) {
  const { account_id, category_id, type, source, date_from, date_to, amount_min, amount_max, q } = params || {};

  const where = { user_id: userId };
  if (account_id != null) where.account_id = account_id;
  if (category_id != null) where.category_id = category_id;
  if (type != null && type !== "") {
    where.type = getTypeWhereClause(type);
  }
  if (source != null && source !== "") where.source = source;

  if (amount_min != null || amount_max != null) {
    where.amount_minor = {};
    if (amount_min != null) where.amount_minor[Op.gte] = amount_min;
    if (amount_max != null) where.amount_minor[Op.lte] = amount_max;
  }

  if (q && q.trim()) {
    where.description = { [Op.iLike]: `%${q.trim()}%` };
  }

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

  return where;
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

    const normalizedType = normalizeTransactionType(data.type);
    const transaction = await Transaction.create({
      user_id: userId,
      account_id: data.account_id,
      category_id: data.category_id,
      amount_minor: data.amount_minor,
      currency,
      base_currency: baseCurrency,
      amount_base_minor: amountBaseMinor,
      fx_rate_id: fxRate.fx_rate_id,
      type: normalizedType,
      source: data.source || "manual",
      description: data.description ?? "",
      metadata: data.metadata ?? null,
      timestamp: data.timestamp || new Date(),
    });

    const balanceDelta = normalizedType === "expense" ? -Number(data.amount_minor) : Number(data.amount_minor);
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
const categoryGroupInclude = {
  model: CategoryGroup,
  as: "group",
  attributes: ["group_id", "name", "type", "icon_key"],
};
const categoryInclude = {
  model: Category,
  as: "category",
  attributes: ["category_id", "group_id", "name", "type", "icon_key"],
  include: [categoryGroupInclude],
};

const mapTransactionListDTO = (transaction) => {
  const tx = transaction?.get ? transaction.get({ plain: true }) : transaction;
  return {
    transaction_id: tx.transaction_id,
    amount_minor: tx.amount_minor,
    currency: tx.currency,
    type: normalizeTransactionType(tx.type),
    source: tx.source,
    description: tx.description,
    metadata: tx.metadata,
    timestamp: tx.timestamp,
    account: tx.account || null,
    category: tx.category || null,
  };
};

const mapTransactionDetailDTO = (transaction) => {
  const tx = transaction?.get ? transaction.get({ plain: true }) : transaction;
  return {
    transaction_id: tx.transaction_id,
    account_id: tx.account_id,
    category_id: tx.category_id,
    amount_minor: tx.amount_minor,
    currency: tx.currency,
    base_currency: tx.base_currency,
    amount_base_minor: tx.amount_base_minor,
    type: normalizeTransactionType(tx.type),
    source: tx.source,
    description: tx.description,
    metadata: tx.metadata,
    timestamp: tx.timestamp,
    created_at: tx.created_at ?? tx.createdAt ?? null,
    updated_at: tx.updated_at ?? tx.updatedAt ?? null,
    account: tx.account || null,
    category: tx.category || null,
    fxRate: tx.fxRate || null,
  };
};

/**
 * List transactions for the user with optional filters. Order by timestamp DESC.
 */
async function fetchTransactions(userId, params = {}) {
  const {
    account_id,
    category_id,
    type,
    source,
    date_from,
    date_to,
    amount_min,
    amount_max,
    q,
    page = 1,
    limit = 20,
    sort_by = "timestamp",
    sort_order = "desc",
  } = params || {};
  logger.info({ userId, params }, "fetchTransactions called");

  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }

  try {
    const where = buildTransactionsWhere(userId, {
      account_id,
      category_id,
      type,
      source,
      date_from,
      date_to,
      amount_min,
      amount_max,
      q,
    });

    const sortableColumns = {
      timestamp: "timestamp",
      amount_minor: "amount_minor",
    };
    const sortColumn = sortableColumns[sort_by] || "timestamp";
    const sortDirection = String(sort_order).toUpperCase() === "ASC" ? "ASC" : "DESC";
    const normalizedPage = Math.max(Number(page) || 1, 1);
    const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const offset = (normalizedPage - 1) * normalizedLimit;

    const { rows, count } = await Transaction.findAndCountAll({
      where,
      include: [accountInclude, categoryInclude],
      order: [[sortColumn, sortDirection]],
      offset,
      limit: normalizedLimit,
      distinct: true,
    });

    const totalPages = count > 0 ? Math.ceil(count / normalizedLimit) : 0;
    const items = (rows || []).map(mapTransactionListDTO);
    logger.info({ userId, count: rows.length, total: count }, "Transactions fetched");
    return {
      items,
      page: normalizedPage,
      limit: normalizedLimit,
      total: count,
      totalPages,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw handleServerError(err, "Error fetching transactions", 500);
  }
}

async function fetchTransactionSummary(userId, params = {}) {
  logger.info({ userId, params }, "fetchTransactionSummary called");

  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }

  try {
    const where = buildTransactionsWhere(userId, params);
    const rows = await Transaction.findAll({
      where,
      attributes: ["type", "amount_base_minor", "base_currency"],
      raw: true,
    });

    const breakdownMap = {};
    for (const row of rows) {
      const currencyCode = row.base_currency || "UNKNOWN";
      if (!breakdownMap[currencyCode]) {
        breakdownMap[currencyCode] = {
          currency_code: currencyCode,
          income_minor: 0,
          expense_minor: 0,
          savings_minor: 0,
          transaction_count: 0,
        };
      }

      const bucket = breakdownMap[currencyCode];
      const normalizedType = normalizeTransactionType(row.type);
      const amountMinor = Number(row.amount_base_minor) || 0;
      bucket.transaction_count += 1;

      if (normalizedType === "income") {
        bucket.income_minor += amountMinor;
      } else if (normalizedType === "expense") {
        bucket.expense_minor += amountMinor;
      } else if (normalizedType === "savings") {
        bucket.savings_minor += amountMinor;
      }
    }

    const currencyBreakdown = Object.values(breakdownMap).map((bucket) => ({
      ...bucket,
      net_cash_flow_minor: bucket.income_minor - bucket.expense_minor,
    }));

    const totals = currencyBreakdown.reduce(
      (acc, bucket) => ({
        income_minor: acc.income_minor + bucket.income_minor,
        expense_minor: acc.expense_minor + bucket.expense_minor,
        savings_minor: acc.savings_minor + bucket.savings_minor,
        net_cash_flow_minor: acc.net_cash_flow_minor + bucket.net_cash_flow_minor,
        transaction_count: acc.transaction_count + bucket.transaction_count,
      }),
      {
        income_minor: 0,
        expense_minor: 0,
        savings_minor: 0,
        net_cash_flow_minor: 0,
        transaction_count: 0,
      }
    );

    const currencyCode = currencyBreakdown.length === 1 ? currencyBreakdown[0].currency_code : null;

    return {
      totals: {
        ...totals,
        currency_code: currencyCode,
      },
      currency_breakdown: currencyBreakdown,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw handleServerError(err, "Error fetching transaction summary", 500);
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
    return mapTransactionDetailDTO(transaction);
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

    const currentAccount = await Account.findOne({
      where: { account_id: transaction.account_id, user_id: userId },
    });
    if (!currentAccount) {
      throw new ApiError(404, "Current account not found");
    }

    const nextAccountId = data.account_id ?? transaction.account_id;
    const nextAccount = await Account.findOne({
      where: { account_id: nextAccountId, user_id: userId },
    });
    if (!nextAccount) {
      throw new ApiError(404, "Account not found");
    }

    const nextType = normalizeTransactionType(data.type ?? transaction.type);
    const nextCategoryId = data.category_id ?? transaction.category_id;
    const nextCategory = await Category.findOne({
      where: {
        category_id: nextCategoryId,
        [Op.or]: [{ user_id: null }, { user_id: userId }],
      },
    });
    if (!nextCategory) {
      throw new ApiError(404, "Category not found");
    }
    if (nextCategory.type && normalizeTransactionType(nextCategory.type) !== nextType) {
      throw new ApiError(400, "Selected category type does not match transaction type");
    }

    const nextAmountMinor = data.amount_minor ?? transaction.amount_minor;
    const nextTimestamp = data.timestamp ?? transaction.timestamp;
    const nextCurrency = (
      data.currency ??
      (data.account_id !== undefined ? nextAccount.currency_code : transaction.currency)
    )
      .toString()
      .toUpperCase();
    const currencyExists = await Currency.findByPk(nextCurrency);
    if (!currencyExists) {
      throw new ApiError(400, "Invalid currency code");
    }

    const shouldReprice =
      data.amount_minor !== undefined ||
      data.currency !== undefined ||
      data.account_id !== undefined ||
      data.type !== undefined ||
      data.timestamp !== undefined;

    const allowed = {};
    if (data.description !== undefined) allowed.description = data.description;
    if (data.metadata !== undefined) allowed.metadata = data.metadata;
    if (data.source !== undefined) allowed.source = data.source;
    if (data.timestamp !== undefined) allowed.timestamp = data.timestamp;

    if (data.account_id !== undefined) allowed.account_id = nextAccountId;
    if (data.category_id !== undefined) allowed.category_id = nextCategoryId;
    if (data.amount_minor !== undefined) allowed.amount_minor = nextAmountMinor;
    if (data.type !== undefined) allowed.type = nextType;
    if (data.currency !== undefined || data.account_id !== undefined) allowed.currency = nextCurrency;

    if (shouldReprice) {
      const baseCurrency = await resolveBaseCurrency(userId, nextAccount.currency_code);
      const asOfDate = new Date(nextTimestamp).toISOString().slice(0, 10);
      const fxRate = await getOrFetchRate(nextCurrency, baseCurrency, asOfDate);
      const fromCurrencyRow = await Currency.findByPk(nextCurrency);
      const baseCurrencyRow = await Currency.findByPk(baseCurrency);
      const amountBaseMinor = computeAmountBaseMinor(
        nextAmountMinor,
        fxRate.rate,
        fromCurrencyRow.minor_unit,
        baseCurrencyRow.minor_unit
      );

      allowed.account_id = nextAccountId;
      allowed.category_id = nextCategoryId;
      allowed.amount_minor = nextAmountMinor;
      allowed.currency = nextCurrency;
      allowed.base_currency = baseCurrency;
      allowed.amount_base_minor = amountBaseMinor;
      allowed.fx_rate_id = fxRate.fx_rate_id;
      allowed.type = nextType;
      allowed.timestamp = nextTimestamp;
    }

    const oldDelta = getBalanceDelta(transaction.type, transaction.amount_minor);
    const newDelta = shouldReprice ? getBalanceDelta(nextType, nextAmountMinor) : oldDelta;
    if (currentAccount.account_id === nextAccount.account_id) {
      const deltaDiff = newDelta - oldDelta;
      if (deltaDiff !== 0) {
        await currentAccount.increment("balance_minor", { by: deltaDiff });
      }
    } else {
      await currentAccount.increment("balance_minor", { by: -oldDelta });
      await nextAccount.increment("balance_minor", { by: newDelta });
    }

    await transaction.update(allowed);
    const updatedTransaction = await Transaction.findOne({
      where: { transaction_id: transactionId, user_id: userId },
      include: [accountInclude, fxRateInclude, categoryInclude],
    });

    logger.info({ userId, transactionId }, "Transaction updated");
    return mapTransactionDetailDTO(updatedTransaction);
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
      const normalizedType = normalizeTransactionType(transaction.type);
      const reverseDelta = normalizedType === "expense" ? Number(transaction.amount_minor) : -Number(transaction.amount_minor);
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
  fetchTransactionSummary,
  fetchTransaction,
  updateTransaction,
  deleteTransaction,
  resolveBaseCurrency,
  computeAmountBaseMinor,
};
