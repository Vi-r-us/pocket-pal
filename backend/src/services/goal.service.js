import handleServerError from "../utils/handleServerError.js";
import logger from "../utils/logger.js";
import ApiError from "../utils/ApiError.js";
import { Op } from "sequelize";
import { isPrimarySavingsContribution } from "../utils/savingsTransaction.js";
import { Category, Currency, Goal, Transaction } from "../models/index.js";
import { getOrFetchRate } from "./fx.service.js";
import { createLog } from "./log.service.js";
import { capitalizeTitleCase, sanitizeDate } from "../utils/sanitize.js";

/**
 * Convert amount from one currency to another using FX rate and minor units.
 */
function convertAmount(amountMinor, rate, fromMinorUnit, toMinorUnit) {
  const fromScale = Math.pow(10, fromMinorUnit);
  const toScale = Math.pow(10, toMinorUnit);
  return Math.round((Number(amountMinor) * Number(rate) * toScale) / fromScale);
}

/**
 * Compute progress for a goal: sum of savings transactions in category within window,
 * converted to target_currency using snapshot (rate at transaction date).
 */
async function computeGoalProgress(goal, transactions, includeTransactions = false) {
  const targetCurrency = goal.target_currency;
  const targetCurrencyRow = await Currency.findByPk(targetCurrency);
  const targetMinor = targetCurrencyRow?.minor_unit ?? 2;

  let progressMinor = 0;
  const contributing = [];

  for (const tx of transactions) {
    const txDate = tx.timestamp instanceof Date ? tx.timestamp : new Date(tx.timestamp);
    const asOfDate = txDate.toISOString().slice(0, 10);
    const fromCurrency = tx.base_currency;
    let amountInTarget = Number(tx.amount_base_minor);

    if (fromCurrency !== targetCurrency) {
      const fxRate = await getOrFetchRate(fromCurrency, targetCurrency, asOfDate);
      const fromRow = await Currency.findByPk(fromCurrency);
      amountInTarget = convertAmount(
        tx.amount_base_minor,
        fxRate.rate,
        fromRow?.minor_unit ?? 2,
        targetMinor
      );
    }
    progressMinor += amountInTarget;
    if (includeTransactions) {
      contributing.push({
        transaction_id: tx.transaction_id,
        amount_base_minor: tx.amount_base_minor,
        base_currency: tx.base_currency,
        amount_in_target_minor: amountInTarget,
        timestamp: tx.timestamp,
        description: tx.description,
      });
    }
  }

  return { progress_minor: progressMinor, contributing_transactions: includeTransactions ? contributing : undefined };
}

/**
 * POST create goal. If category_id not provided, create a savings category for the goal.
 */
async function createGoal(userId, data) {
  logger.info({ userId, data }, "createGoal called");

  if (userId == null) {
    throw new ApiError(400, "User ID is required");
  }

  try {
    const targetCurrency = (data.target_currency || "").toString().toUpperCase();
    const currencyExists = await Currency.findByPk(targetCurrency);
    if (!currencyExists) {
      throw new ApiError(400, "Invalid target_currency");
    }

    let categoryId = data.category_id ?? data.categoryId;

    if (categoryId == null) {
      const categoryName = `Goal: ${(data.name || "Savings").trim().slice(0, 60)}`;
      const name = capitalizeTitleCase(categoryName);
      const existing = await Category.findOne({
        where: { user_id: userId, type: "savings", name },
      });
      if (existing) {
        categoryId = existing.category_id;
      } else {
        const cat = await Category.create({
          name,
          type: "savings",
          group_id: null,
          is_system: false,
          is_active: true,
          user_id: userId,
        });
        categoryId = cat.category_id;
      }
    } else {
      const cat = await Category.findOne({
        where: {
          category_id: categoryId,
          [Op.or]: [{ user_id: null }, { user_id: userId }],
          type: "savings",
        },
      });
      if (!cat) {
        throw new ApiError(400, "Category not found or not a savings category");
      }
    }

    const startDate = data.start_date instanceof Date ? data.start_date : new Date(data.start_date);
    const endDate = data.end_date != null ? (data.end_date instanceof Date ? data.end_date : new Date(data.end_date)) : null;

    const goal = await Goal.create({
      user_id: userId,
      name: (data.name || "Goal").trim(),
      target_amount_minor: data.target_amount_minor,
      target_currency: targetCurrency,
      category_id: categoryId,
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endDate ? endDate.toISOString().slice(0, 10) : null,
      status: "active",
    });

    await createLog({
      user_id: userId,
      log_type: "audit",
      action: "goal_create",
      entity: "goal",
      entity_id: goal.public_id,
      details: { goal_id: goal.goal_id },
    });

    logger.info({ userId, goalId: goal.goal_id, publicId: goal.public_id }, "Goal created");
    return await getGoalDetail(userId, goal.public_id);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw handleServerError(err, "Error creating goal", 500);
  }
}

/**
 * GET list goals with progress.
 */
async function listGoals(userId) {
  logger.info({ userId }, "listGoals called");

  if (userId == null) {
    throw new ApiError(400, "User ID is required");
  }

  try {
    const goals = await Goal.findAll({
      where: { user_id: userId },
      include: [
        { model: Category, as: "category", attributes: ["category_id", "name", "type"] },
        { model: Currency, as: "currency", attributes: ["code", "symbol", "minor_unit"] },
      ],
      order: [["created_at", "DESC"]],
    });

    const result = [];
    for (const goal of goals) {
      const startDate = new Date(goal.start_date);
      startDate.setUTCHours(0, 0, 0, 0);
      let endDate = goal.end_date ? new Date(goal.end_date) : new Date();
      endDate.setUTCHours(23, 59, 59, 999);

      const transactions = await Transaction.findAll({
        where: {
          user_id: userId,
          category_id: goal.category_id,
          // type: "savings",
          timestamp: { [Op.between]: [sanitizeDate(startDate), sanitizeDate(endDate)] },
        },
        attributes: ["transaction_id", "amount_base_minor", "base_currency", "timestamp", "metadata"],
        raw: true,
      });

      const primaryTransactions = transactions.filter(isPrimarySavingsContribution);
      const { progress_minor } = await computeGoalProgress(goal, primaryTransactions, false);

      result.push({
        public_id: goal.public_id,
        name: goal.name,
        target_amount_minor: goal.target_amount_minor,
        target_currency: goal.target_currency,
        category_id: goal.category_id,
        category: goal.category,
        start_date: goal.start_date,
        end_date: goal.end_date,
        status: goal.status,
        progress_minor,
        created_at: goal.created_at,
        updated_at: goal.updated_at,
      });
    }

    return result;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw handleServerError(err, "Error listing goals", 500);
  }
}

/**
 * GET goal detail + contributing transactions.
 */
async function getGoalDetail(userId, publicId) {
  logger.info({ userId, publicId }, "getGoalDetail called");

  if (userId == null) {
    throw new ApiError(400, "User ID is required");
  }

  try {
    const goal = await Goal.findOne({
      where: { user_id: userId, public_id: publicId },
      include: [
        { model: Category, as: "category", attributes: ["category_id", "name", "type"] },
        { model: Currency, as: "currency", attributes: ["code", "symbol", "minor_unit"] },
      ],
    });

    if (!goal) {
      throw new ApiError(404, "Goal not found");
    }

    const startDate = new Date(goal.start_date);
    startDate.setUTCHours(0, 0, 0, 0);
    let endDate = goal.end_date ? new Date(goal.end_date) : new Date();
    endDate.setUTCHours(23, 59, 59, 999);

    const transactions = await Transaction.findAll({
      where: {
        user_id: userId,
        category_id: goal.category_id,
        type: "savings",
        timestamp: { [Op.between]: [sanitizeDate(startDate), sanitizeDate(endDate)] },
      },
      attributes: ["transaction_id", "amount_base_minor", "base_currency", "timestamp", "description", "metadata"],
      order: [["timestamp", "ASC"]],
      raw: true,
    });

    const primaryTransactions = transactions.filter(isPrimarySavingsContribution);
    const { progress_minor, contributing_transactions } = await computeGoalProgress(
      goal,
      primaryTransactions,
      true
    );

    return {
      public_id: goal.public_id,
      name: goal.name,
      target_amount_minor: goal.target_amount_minor,
      target_currency: goal.target_currency,
      category_id: goal.category_id,
      category: goal.category,
      start_date: goal.start_date,
      end_date: goal.end_date,
      status: goal.status,
      progress_minor,
      contributing_transactions,
      created_at: goal.created_at,
      updated_at: goal.updated_at,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw handleServerError(err, "Error fetching goal", 500);
  }
}

/**
 * PATCH update goal.
 */
async function updateGoal(userId, publicId, data) {
  logger.info({ userId, publicId, data }, "updateGoal called");

  if (userId == null) {
    throw new ApiError(400, "User ID is required");
  }

  try {
    const goal = await Goal.findOne({
      where: { user_id: userId, public_id: publicId },
    });

    if (!goal) {
      throw new ApiError(404, "Goal not found");
    }

    const updates = {};
    if (data.name !== undefined) updates.name = String(data.name).trim();
    if (data.target_amount_minor !== undefined) updates.target_amount_minor = data.target_amount_minor;
    if (data.target_currency !== undefined) {
      const curr = (data.target_currency || "").toString().toUpperCase();
      const exists = await Currency.findByPk(curr);
      if (!exists) throw new ApiError(400, "Invalid target_currency");
      updates.target_currency = curr;
    }
    if (data.end_date !== undefined) {
      updates.end_date = data.end_date == null ? null : new Date(data.end_date).toISOString().slice(0, 10);
    }
    if (data.status !== undefined) updates.status = data.status;

    await goal.update(updates);

    await createLog({
      user_id: userId,
      log_type: "audit",
      action: "goal_update",
      entity: "goal",
      entity_id: publicId,
      details: { updated_fields: Object.keys(updates) },
    });

    logger.info({ userId, goalId: goal.goal_id }, "Goal updated");
    return await getGoalDetail(userId, publicId);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw handleServerError(err, "Error updating goal", 500);
  }
}

/**
 * DELETE goal (soft: set status=archived).
 */
async function deleteGoal(userId, publicId) {
  logger.info({ userId, publicId }, "deleteGoal called");

  if (userId == null) {
    throw new ApiError(400, "User ID is required");
  }

  try {
    const goal = await Goal.findOne({
      where: { user_id: userId, public_id: publicId },
    });

    if (!goal) {
      throw new ApiError(404, "Goal not found");
    }

    await goal.update({ status: "archived" });

    await createLog({
      user_id: userId,
      log_type: "audit",
      action: "goal_delete",
      entity: "goal",
      entity_id: publicId,
      details: { goal_id: goal.goal_id },
    });

    logger.info({ userId, goalId: goal.goal_id }, "Goal archived");
    return null;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw handleServerError(err, "Error deleting goal", 500);
  }
}

export { createGoal, listGoals, getGoalDetail, updateGoal, deleteGoal };
