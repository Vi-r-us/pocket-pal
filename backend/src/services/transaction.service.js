import { randomUUID } from "node:crypto";
import handleServerError from "../utils/handleServerError.js";
import logger from "../utils/logger.js";
import ApiError from "../utils/ApiError.js";
import { Op, fn, col, where as sequelizeWhere } from "sequelize";
import { sequelize } from "../db/sequelize.js";
import { Account, Category, CategoryGroup, Currency, FXRate, Transaction, User } from "../models/index.js";
import { getOrFetchRate } from "./fx.service.js";
import { sanitizeDate } from "../utils/sanitize.js";
import { TRANSACTION_TYPE_NORMALIZATION_MAP } from "../constants/constants.js";
import { getBalanceDelta, getBalanceDeltaFromTransaction } from "../utils/accountBalance.js";
import {
  buildAllocateMetadata,
  buildExternalTransferMetadata,
  buildMirrorTransferMetadata,
  buildPrimaryTransferMetadata,
  isInternalTransferSavings,
  getSavingsMode,
  getTransactionMetadata,
  getTransferLeg,
  isPrimarySavingsContribution,
} from "../utils/savingsTransaction.js";

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
    // Filter by the effective reporting date so income (or any transaction) attributed
    // to a different month via accounting_date lands in that month's list and metrics.
    const effectiveDate = fn("COALESCE", col("Transaction.accounting_date"), col("Transaction.timestamp"));
    const dateConditions = [];
    if (date_from != null) {
      const startOfDay = new Date(date_from);
      startOfDay.setUTCHours(0, 0, 0, 0);
      dateConditions.push(sequelizeWhere(effectiveDate, { [Op.gte]: sanitizeDate(startOfDay) }));
    }
    if (date_to != null) {
      const endOfDay = new Date(date_to);
      endOfDay.setUTCHours(23, 59, 59, 999);
      dateConditions.push(sequelizeWhere(effectiveDate, { [Op.lte]: sanitizeDate(endOfDay) }));
    }
    if (dateConditions.length > 0) {
      where[Op.and] = dateConditions;
    }
  }

  return where;
}

async function resolveCategory(userId, categoryId) {
  const category = await Category.findOne({
    where: {
      category_id: categoryId,
      [Op.or]: [{ user_id: null }, { user_id: userId }],
    },
  });
  if (!category) {
    throw new ApiError(404, "Category not found");
  }
  return category;
}

async function resolveAccount(userId, accountId) {
  const account = await Account.findOne({
    where: { account_id: accountId, user_id: userId },
  });
  if (!account) {
    throw new ApiError(404, "Account not found");
  }
  return account;
}

async function computeFxSnapshot(userId, { amountMinor, currency, account, timestamp }) {
  const baseCurrency = await resolveBaseCurrency(userId, account.currency_code);
  const asOfDate = timestamp
    ? new Date(timestamp).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const fxRate = await getOrFetchRate(currency, baseCurrency, asOfDate);
  const fromCurrencyRow = await Currency.findByPk(currency);
  const baseCurrencyRow = await Currency.findByPk(baseCurrency);
  const amountBaseMinor = computeAmountBaseMinor(
    amountMinor,
    fxRate.rate,
    fromCurrencyRow.minor_unit,
    baseCurrencyRow.minor_unit
  );
  return { baseCurrency, amountBaseMinor, fxRate };
}

async function validateSavingsTransferAccounts(userId, sourceAccount, destinationAccountId) {
  if (destinationAccountId == null) {
    throw new ApiError(400, "destination_account_id is required for transfer savings");
  }
  if (Number(destinationAccountId) === Number(sourceAccount.account_id)) {
    throw new ApiError(400, "Source and destination accounts must be different");
  }

  const destinationAccount = await resolveAccount(userId, destinationAccountId);
  if (!destinationAccount.is_active) {
    throw new ApiError(400, "Destination account is not active");
  }
  if (destinationAccount.currency_code !== sourceAccount.currency_code) {
    throw new ApiError(400, "Destination account must use the same currency as the source account");
  }
  return destinationAccount;
}

async function applyBalanceDelta(account, delta, dbTransaction) {
  if (!account || delta === 0) return;
  await account.increment("balance_minor", { by: delta, transaction: dbTransaction });
}

async function findLinkedTransferTransactions(userId, transaction) {
  const metadata = getTransactionMetadata(transaction);
  const groupId = metadata.transfer_group_id;
  if (!groupId) return [transaction];

  return Transaction.findAll({
    where: {
      user_id: userId,
      [Op.or]: [
        { transaction_id: transaction.transaction_id },
        { metadata: { [Op.contains]: { transfer_group_id: groupId } } },
      ],
    },
  });
}

async function createSavingsAllocateTransaction(userId, data, account, category, normalizedType) {
  const currency = (data.currency || account.currency_code).toString().toUpperCase();
  const currencyExists = await Currency.findByPk(currency);
  if (!currencyExists) {
    throw new ApiError(400, "Invalid currency code");
  }

  const timestamp = data.timestamp || new Date();
  const { baseCurrency, amountBaseMinor, fxRate } = await computeFxSnapshot(userId, {
    amountMinor: data.amount_minor,
    currency,
    account,
    timestamp,
  });

  const metadata = {
    ...(data.metadata && typeof data.metadata === "object" ? data.metadata : {}),
    ...buildAllocateMetadata(),
  };

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
    metadata,
    timestamp,
    accounting_date: data.accounting_date ?? null,
  });

  return transaction;
}

async function createSavingsExternalTransfer(userId, data, account, category, normalizedType) {
  const currency = (data.currency || account.currency_code).toString().toUpperCase();
  const currencyExists = await Currency.findByPk(currency);
  if (!currencyExists) {
    throw new ApiError(400, "Invalid currency code");
  }

  const timestamp = data.timestamp || new Date();
  const { baseCurrency, amountBaseMinor, fxRate } = await computeFxSnapshot(userId, {
    amountMinor: data.amount_minor,
    currency,
    account,
    timestamp,
  });

  const metadata = {
    ...(data.metadata && typeof data.metadata === "object" ? data.metadata : {}),
    ...buildExternalTransferMetadata(),
  };

  return sequelize.transaction(async (dbTransaction) => {
    const transaction = await Transaction.create(
      {
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
        metadata,
        timestamp,
        accounting_date: data.accounting_date ?? null,
      },
      { transaction: dbTransaction }
    );

    const delta = getBalanceDelta(normalizedType, data.amount_minor, {
      savings_mode: "transfer",
      transfer_leg: "primary",
    });
    await applyBalanceDelta(account, delta, dbTransaction);

    return transaction;
  });
}

async function createSavingsTransferPair(userId, data, account, category, normalizedType) {
  const destinationAccount = await validateSavingsTransferAccounts(
    userId,
    account,
    data.destination_account_id
  );

  const currency = (data.currency || account.currency_code).toString().toUpperCase();
  const currencyExists = await Currency.findByPk(currency);
  if (!currencyExists) {
    throw new ApiError(400, "Invalid currency code");
  }

  const timestamp = data.timestamp || new Date();
  const transferGroupId = randomUUID();

  return sequelize.transaction(async (dbTransaction) => {
    const { baseCurrency, amountBaseMinor, fxRate } = await computeFxSnapshot(userId, {
      amountMinor: data.amount_minor,
      currency,
      account,
      timestamp,
    });

    const primaryMetadata = {
      ...(data.metadata && typeof data.metadata === "object" ? data.metadata : {}),
      ...buildPrimaryTransferMetadata({
        transferGroupId,
        destinationAccountId: destinationAccount.account_id,
      }),
    };

    const primary = await Transaction.create(
      {
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
        metadata: primaryMetadata,
        timestamp,
        accounting_date: data.accounting_date ?? null,
      },
      { transaction: dbTransaction }
    );

    const destBaseCurrency = await resolveBaseCurrency(userId, destinationAccount.currency_code);
    const destFxRate = await getOrFetchRate(currency, destBaseCurrency, new Date(timestamp).toISOString().slice(0, 10));
    const fromCurrencyRow = await Currency.findByPk(currency);
    const destBaseCurrencyRow = await Currency.findByPk(destBaseCurrency);
    const destAmountBaseMinor = computeAmountBaseMinor(
      data.amount_minor,
      destFxRate.rate,
      fromCurrencyRow.minor_unit,
      destBaseCurrencyRow.minor_unit
    );

    await Transaction.create(
      {
        user_id: userId,
        account_id: destinationAccount.account_id,
        category_id: data.category_id,
        amount_minor: data.amount_minor,
        currency,
        base_currency: destBaseCurrency,
        amount_base_minor: destAmountBaseMinor,
        fx_rate_id: destFxRate.fx_rate_id,
        type: normalizedType,
        source: "transfer",
        description: `Transfer from ${account.name}`,
        metadata: buildMirrorTransferMetadata({
          transferGroupId,
          primaryTransactionId: primary.transaction_id,
        }),
        timestamp,
      },
      { transaction: dbTransaction }
    );

    const primaryDelta = getBalanceDelta(normalizedType, data.amount_minor, {
      savings_mode: "transfer",
      transfer_leg: "primary",
    });
    const mirrorDelta = getBalanceDelta(normalizedType, data.amount_minor, {
      savings_mode: "transfer",
      transfer_leg: "mirror",
    });

    await applyBalanceDelta(account, primaryDelta, dbTransaction);
    await applyBalanceDelta(destinationAccount, mirrorDelta, dbTransaction);

    return primary;
  });
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
    const account = await resolveAccount(userId, data.account_id);
    if (!account.is_active) {
      throw new ApiError(400, "Account is not active");
    }

    const category = await resolveCategory(userId, data.category_id);

    const normalizedType = normalizeTransactionType(data.type);
    if (category.type && normalizeTransactionType(category.type) !== normalizedType) {
      throw new ApiError(400, "Selected category type does not match transaction type");
    }

    if (normalizedType === "savings") {
      const savingsMode = data.savings_mode === "transfer" ? "transfer" : "allocate";
      if (savingsMode === "transfer") {
        const transaction = data.destination_account_id
          ? await createSavingsTransferPair(userId, data, account, category, normalizedType)
          : await createSavingsExternalTransfer(userId, data, account, category, normalizedType);
        logger.info({ userId, transactionId: transaction.transaction_id }, "Transfer savings created");
        return transaction;
      }

      const transaction = await createSavingsAllocateTransaction(userId, data, account, category, normalizedType);
      logger.info({ userId, transactionId: transaction.transaction_id }, "Allocate savings created");
      return transaction;
    }

    const currency = (data.currency || account.currency_code).toString().toUpperCase();
    const currencyExists = await Currency.findByPk(currency);
    if (!currencyExists) {
      throw new ApiError(400, "Invalid currency code");
    }

    const timestamp = data.timestamp || new Date();
    const { baseCurrency, amountBaseMinor, fxRate } = await computeFxSnapshot(userId, {
      amountMinor: data.amount_minor,
      currency,
      account,
      timestamp,
    });

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
      timestamp,
      accounting_date: data.accounting_date ?? null,
    });

    const balanceDelta = getBalanceDelta(normalizedType, data.amount_minor);
    await applyBalanceDelta(account, balanceDelta);

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
    accounting_date: tx.accounting_date ?? null,
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
    accounting_date: tx.accounting_date ?? null,
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
      attributes: ["type", "amount_base_minor", "base_currency", "metadata"],
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
      } else if (normalizedType === "savings" && isPrimarySavingsContribution(row)) {
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

function isTransferSavingsTransaction(transaction) {
  const metadata = getTransactionMetadata(transaction);
  return normalizeTransactionType(transaction.type) === "savings" && getSavingsMode(metadata) === "transfer";
}

function assertTransferEditableFields(transaction, data) {
  const metadata = getTransactionMetadata(transaction);
  if (!isTransferSavingsTransaction(transaction) || !isInternalTransferSavings(metadata)) return;

  const blockedFields = ["account_id", "amount_minor", "currency", "type", "category_id"];
  const attempted = blockedFields.filter((field) => data[field] !== undefined);
  if (attempted.length > 0) {
    throw new ApiError(
      400,
      "Transfer savings cannot change amount, account, category, or type. Delete and recreate instead."
    );
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

    const metadata = getTransactionMetadata(transaction);
    if (metadata.transfer_leg === "mirror") {
      throw new ApiError(400, "Transfer mirror transactions cannot be edited directly");
    }

    assertTransferEditableFields(transaction, data);

    const currentAccount = await resolveAccount(userId, transaction.account_id);

    const nextAccountId = data.account_id ?? transaction.account_id;
    const nextAccount = await resolveAccount(userId, nextAccountId);

    const nextType = normalizeTransactionType(data.type ?? transaction.type);
    const nextCategoryId = data.category_id ?? transaction.category_id;
    const nextCategory = await resolveCategory(userId, nextCategoryId);
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
    if (data.accounting_date !== undefined) allowed.accounting_date = data.accounting_date;

    if (data.account_id !== undefined) allowed.account_id = nextAccountId;
    if (data.category_id !== undefined) allowed.category_id = nextCategoryId;
    if (data.amount_minor !== undefined) allowed.amount_minor = nextAmountMinor;
    if (data.type !== undefined) allowed.type = nextType;
    if (data.currency !== undefined || data.account_id !== undefined) allowed.currency = nextCurrency;

    if (shouldReprice) {
      const { baseCurrency, amountBaseMinor, fxRate } = await computeFxSnapshot(userId, {
        amountMinor: nextAmountMinor,
        currency: nextCurrency,
        account: nextAccount,
        timestamp: nextTimestamp,
      });

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

    const oldDelta = getBalanceDeltaFromTransaction(transaction);
    const newDelta = shouldReprice
      ? getBalanceDelta(nextType, nextAmountMinor, {
          savings_mode: getSavingsMode(metadata),
          transfer_leg: getTransferLeg(metadata),
          metadata,
        })
      : oldDelta;

    if (currentAccount.account_id === nextAccount.account_id) {
      const deltaDiff = newDelta - oldDelta;
      if (deltaDiff !== 0) {
        await applyBalanceDelta(currentAccount, deltaDiff);
      }
    } else {
      await applyBalanceDelta(currentAccount, -oldDelta);
      await applyBalanceDelta(nextAccount, newDelta);
    }

    await transaction.update(allowed);

    if (
      isTransferSavingsTransaction(transaction) &&
      isInternalTransferSavings(metadata) &&
      data.timestamp !== undefined
    ) {
      const groupId = metadata.transfer_group_id;
      if (groupId) {
        await Transaction.update(
          { timestamp: data.timestamp },
          {
            where: {
              user_id: userId,
              metadata: { [Op.contains]: { transfer_group_id: groupId, transfer_leg: "mirror" } },
            },
          }
        );
      }
    }

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

    const linked = await findLinkedTransferTransactions(userId, transaction);

    await sequelize.transaction(async (dbTransaction) => {
      for (const leg of linked) {
        const account = await Account.findByPk(leg.account_id, { transaction: dbTransaction });
        if (account) {
          const reverseDelta = -getBalanceDeltaFromTransaction(leg);
          await applyBalanceDelta(account, reverseDelta, dbTransaction);
        }
        await leg.destroy({ transaction: dbTransaction });
      }
    });

    logger.info({ userId, transactionId, deletedCount: linked.length }, "Transaction deleted");
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
  isPrimarySavingsContribution,
};
