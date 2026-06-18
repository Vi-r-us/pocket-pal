import handleServerError from "../utils/handleServerError.js";
import logger from "../utils/logger.js";
import ApiError from "../utils/ApiError.js";
import { Op } from "sequelize";
import { sequelize } from "../db/sequelize.js";
import { Account, Currency, Transaction } from "../models/index.js";
import { computeBalanceFromTransactions } from "../utils/accountBalance.js";
import { createLog } from "./log.service.js";
import getState from "../utils/logUtils.js";

const currencyInclude = { model: Currency, as: "currency", attributes: ["code", "name", "symbol", "minor_unit"] };

/**
 * Fetches accounts for a user. Optional filters + pagination: type, is_active, q, page, limit, sort_by, sort_order.
 * @param {number} userId
 * @param {Object} params - { type?, is_active?, q?, page?, limit?, sort_by?, sort_order? }
 */
const fetchAccounts = async (userId, params = {}) => {
  const { type, is_active, q, page, limit, sort_by, sort_order } = params || {};
  logger.info({ userId, type, is_active, q, page, limit, sort_by, sort_order }, "fetchAccounts called");

  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }

  try {
    const whereClause = { user_id: userId };
    if (type !== undefined && type !== null && type !== "") {
      whereClause.type = type;
    }
    if (is_active !== undefined && is_active !== null) {
      whereClause.is_active = is_active;
    }
    if (q && q.trim()) {
      const query = `%${q.trim()}%`;
      whereClause[Op.or] = [
        { name: { [Op.iLike]: query } },
        { institution_name: { [Op.iLike]: query } },
        { account_number_last4: { [Op.iLike]: query } },
      ];
    }

    const sortableColumns = {
      name: "name",
      type: "type",
      balance_minor: "balance_minor",
      display_order: "display_order",
      created_at: "created_at",
      updated_at: "updated_at",
    };
    const hasPagination = page != null || limit != null;
    const hasCustomSort = !!sort_by || !!sort_order;

    if (!hasPagination && !hasCustomSort) {
      const accounts = await Account.findAll({
        where: whereClause,
        include: [currencyInclude],
        order: [
          ["display_order", "ASC"],
          ["name", "ASC"],
        ],
      });
      logger.info({ userId, count: accounts.length }, "Fetched accounts (non-paginated)");
      return accounts;
    }

    const normalizedPage = Math.max(Number(page) || 1, 1);
    const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const offset = (normalizedPage - 1) * normalizedLimit;
    const sortColumn = sortableColumns[sort_by] || "display_order";
    const sortDirection = String(sort_order).toUpperCase() === "DESC" ? "DESC" : "ASC";

    const { rows, count } = await Account.findAndCountAll({
      where: whereClause,
      include: [currencyInclude],
      order: [
        [sortColumn, sortDirection],
        ["name", "ASC"],
      ],
      limit: normalizedLimit,
      offset,
      distinct: true,
    });

    const totalPages = count > 0 ? Math.ceil(count / normalizedLimit) : 0;
    logger.info({ userId, count: rows.length, total: count }, "Fetched accounts (paginated)");
    return {
      items: rows,
      page: normalizedPage,
      limit: normalizedLimit,
      total: count,
      totalPages,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw handleServerError(error, "Error fetching accounts", 500);
  }
};

/**
 * Fetches a single account by id (must belong to user).
 */
const fetchAccount = async (userId, accountId) => {
  logger.info({ userId, accountId }, "fetchAccount called");

  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }
  if (accountId === undefined || accountId === null || accountId === "") {
    throw new ApiError(400, "Account ID is required");
  }

  try {
    const account = await Account.findOne({
      where: { account_id: accountId, user_id: userId },
      include: [currencyInclude],
    });

    if (!account) {
      throw new ApiError(404, "Account not found");
    }

    return account;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw handleServerError(error, "Error fetching account", 500);
  }
};

/**
 * Creates a new account. Validates currency_code exists; duplicate name per user rejected.
 */
const createAccount = async (userId, data) => {
  logger.info({ userId, data }, "createAccount called");

  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }

  try {
    const currency = await Currency.findByPk(data.currency_code);
    if (!currency) {
      throw new ApiError(400, "Invalid currency code");
    }

    const existing = await Account.findOne({
      where: { user_id: userId, name: data.name },
    });
    if (existing) {
      throw new ApiError(409, "Account with the same name already exists");
    }

    const normalizedOpeningBalance = Number.isFinite(Number(data.opening_balance_minor))
      ? Number(data.opening_balance_minor)
      : 0;

    const newAccount = await Account.create({
      name: data.name,
      type: data.type,
      currency_code: data.currency_code,
      balance_minor: normalizedOpeningBalance,
      opening_balance_minor: normalizedOpeningBalance,
      institution_name: data.institution_name || null,
      account_number_last4: data.account_number_last4 || null,
      notes: data.notes || null,
      include_in_net_worth: data.include_in_net_worth ?? true,
      display_order: data.display_order ?? 0,
      icon_key: data.icon_key || null,
      credit_limit_minor: data.credit_limit_minor ?? null,
      statement_day: data.statement_day ?? null,
      payment_due_day: data.payment_due_day ?? null,
      is_active: data.is_active ?? true,
      user_id: userId,
    });

    logger.info({ userId, accountId: newAccount.account_id }, "Account created");

    await createLog({
      user_id: userId,
      log_type: "audit",
      action: "create",
      entity: "account",
      entity_id: newAccount.account_id,
      message: `Account "${data.name}" created`,
      details: { source: "account.service.createAccount" },
      old_value: null,
      new_value: newAccount.get({ plain: true }),
    });

    return newAccount;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw handleServerError(error, "Error creating account", 500);
  }
};

/**
 * Updates an account. Only owner can update. Validates currency_code if present.
 */
const updateAccount = async (userId, accountId, updateData) => {
  logger.info({ userId, accountId, updateData }, "updateAccount called");

  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }
  if (accountId === undefined || accountId === null || accountId === "") {
    throw new ApiError(400, "Account ID is required");
  }

  try {
    const account = await Account.findByPk(accountId);
    if (!account) {
      throw new ApiError(404, "Account not found");
    }
    if (account.user_id !== userId) {
      throw new ApiError(403, "You do not have permission to update this account");
    }

    if (updateData.currency_code !== undefined) {
      const currency = await Currency.findByPk(updateData.currency_code);
      if (!currency) {
        throw new ApiError(400, "Invalid currency code");
      }
    }

    const normalizedUpdateData = { ...updateData };
    if (normalizedUpdateData.institution_name === "") normalizedUpdateData.institution_name = null;
    if (normalizedUpdateData.account_number_last4 === "") normalizedUpdateData.account_number_last4 = null;
    if (normalizedUpdateData.notes === "") normalizedUpdateData.notes = null;
    if (normalizedUpdateData.icon_key === "") normalizedUpdateData.icon_key = null;

    if (normalizedUpdateData.opening_balance_minor !== undefined) {
      const oldOpening = Number(account.opening_balance_minor);
      const newOpening = Number(normalizedUpdateData.opening_balance_minor);
      const openingDelta = newOpening - oldOpening;
      if (openingDelta !== 0) {
        normalizedUpdateData.balance_minor = Number(account.balance_minor) + openingDelta;
      }
    }

    const previousState = getState(account, normalizedUpdateData);
    await account.update(normalizedUpdateData);
    const newState = getState(account, normalizedUpdateData);

    logger.info({ userId, accountId }, "Account updated");

    await createLog({
      user_id: userId,
      log_type: "audit",
      action: "update",
      entity: "account",
      entity_id: accountId,
      message: "Account updated",
      details: { source: "account.service.updateAccount" },
      old_value: previousState,
      new_value: newState,
      field_name: Object.keys(normalizedUpdateData).join(", "),
    });

    return account;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw handleServerError(error, "Error updating account", 500);
  }
};

/**
 * Deletes an account. Only owner; fails with 409 if account has transactions.
 */
const deleteAccount = async (userId, accountId) => {
  logger.info({ userId, accountId }, "deleteAccount called");

  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }
  if (accountId === undefined || accountId === null || accountId === "") {
    throw new ApiError(400, "Account ID is required");
  }

  try {
    const account = await Account.findByPk(accountId);
    if (!account) {
      throw new ApiError(404, "Account not found");
    }
    if (account.user_id !== userId) {
      throw new ApiError(403, "You do not have permission to delete this account");
    }

    // const usageCount = await Transaction.count({
    //   where: { account_id: accountId },
    // });
    // if (usageCount > 0) {
    //   throw new ApiError(
    //     409,
    //     "Account has transactions. Deactivate it instead by setting is_active to false."
    //   );
    // }

    await account.destroy();
    logger.info({ userId, accountId }, "Account deleted");

    await createLog({
      user_id: userId,
      log_type: "audit",
      action: "delete",
      entity: "account",
      entity_id: accountId,
      message: "Account deleted",
      details: { source: "account.service.deleteAccount" },
      old_value: account.get({ plain: true }),
      new_value: null,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw handleServerError(error, "Error deleting account", 500);
  }
};

/**
 * Recompute balance_minor from opening_balance_minor + sum of transaction deltas.
 */
const reconcileAccountBalance = async (userId, accountId) => {
  logger.info({ userId, accountId }, "reconcileAccountBalance called");

  if (userId == null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }
  if (accountId == null || accountId === "") {
    throw new ApiError(400, "Account ID is required");
  }

  try {
    return await sequelize.transaction(async (dbTransaction) => {
      const account = await Account.findOne({
        where: { account_id: accountId, user_id: userId },
        transaction: dbTransaction,
        lock: dbTransaction.LOCK.UPDATE,
      });

      if (!account) {
        throw new ApiError(404, "Account not found");
      }

      const transactions = await Transaction.findAll({
        where: { user_id: userId, account_id: accountId },
        attributes: ["type", "amount_minor", "metadata"],
        transaction: dbTransaction,
      });

      const openingBalanceMinor = Number(account.opening_balance_minor);
      const previousBalanceMinor = Number(account.balance_minor);
      const computedBalanceMinor = computeBalanceFromTransactions(openingBalanceMinor, transactions);
      const adjusted = computedBalanceMinor !== previousBalanceMinor;

      if (adjusted) {
        await account.update({ balance_minor: computedBalanceMinor }, { transaction: dbTransaction });

        await createLog({
          user_id: userId,
          log_type: "audit",
          action: "update",
          entity: "account",
          entity_id: accountId,
          message: "Account balance synced from transactions",
          details: {
            source: "account.service.reconcileAccountBalance",
            transaction_count: transactions.length,
          },
          old_value: { balance_minor: previousBalanceMinor },
          new_value: { balance_minor: computedBalanceMinor },
          field_name: "balance_minor",
        });
      }

      logger.info(
        { userId, accountId, adjusted, previousBalanceMinor, computedBalanceMinor },
        "Account balance reconciled"
      );

      return {
        account_id: accountId,
        opening_balance_minor: openingBalanceMinor,
        previous_balance_minor: previousBalanceMinor,
        computed_balance_minor: computedBalanceMinor,
        adjusted,
        transaction_count: transactions.length,
      };
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw handleServerError(error, "Error reconciling account balance", 500);
  }
};

/**
 * Reconcile balance_minor for all accounts owned by the user.
 */
const reconcileAllAccountBalances = async (userId) => {
  logger.info({ userId }, "reconcileAllAccountBalances called");

  if (userId == null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }

  try {
    const accounts = await Account.findAll({
      where: { user_id: userId },
      attributes: ["account_id"],
      order: [["account_id", "ASC"]],
    });

    const results = [];
    for (const account of accounts) {
      const result = await reconcileAccountBalance(userId, account.account_id);
      results.push(result);
    }

    const accountsAdjusted = results.filter((row) => row.adjusted).length;

    return {
      accounts_checked: results.length,
      accounts_adjusted: accountsAdjusted,
      results,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw handleServerError(error, "Error reconciling account balances", 500);
  }
};

export {
  fetchAccounts,
  fetchAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  reconcileAccountBalance,
  reconcileAllAccountBalances,
};
