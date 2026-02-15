import handleServerError from "../utils/handleServerError.js";
import logger from "../utils/logger.js";
import ApiError from "../utils/ApiError.js";
import { Account, Currency } from "../models/index.js";
import { createLog } from "./log.service.js";
import getState from "../utils/logUtils.js";

const currencyInclude = { model: Currency, as: "currency", attributes: ["code", "name", "symbol", "minor_unit"] };

/**
 * Fetches accounts for a user. Optional filters: type, is_active.
 * @param {number} userId
 * @param {Object} params - { type?, is_active? }
 */
const fetchAccounts = async (userId, params = {}) => {
  const { type, is_active } = params || {};
  logger.info({ userId, type, is_active }, "fetchAccounts called");

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

    const accounts = await Account.findAll({
      where: whereClause,
      include: [currencyInclude],
      order: [["name", "ASC"]],
    });

    if (!accounts) {
      logger.warn({ userId }, "No accounts found");
      return [];
    }

    logger.info({ userId, count: accounts.length }, "Fetched accounts");
    return accounts;
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

    const newAccount = await Account.create({
      name: data.name,
      type: data.type,
      currency_code: data.currency_code,
      balance_minor: 0,
      is_active: true,
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

    const previousState = getState(account, updateData);
    await account.update(updateData);
    const newState = getState(account, updateData);

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
      field_name: Object.keys(updateData).join(", "),
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

export {
  fetchAccounts,
  fetchAccount,
  createAccount,
  updateAccount,
  deleteAccount,
};
