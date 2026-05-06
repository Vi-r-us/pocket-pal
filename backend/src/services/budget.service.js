import handleServerError from "../utils/handleServerError.js";
import logger from "../utils/logger.js";
import ApiError from "../utils/ApiError.js";
import { Op } from "sequelize";
import {
  Account,
  Budget,
  BudgetPeriod,
  Category,
  Currency,
  Transaction,
  User,
} from "../models/index.js";
import { getOrFetchRate } from "./fx.service.js";
import { createLog } from "./log.service.js";

/**
 * Resolve base currency for budget: user.base_currency if set and valid,
 * else first account's currency_code. Throws if neither available.
 */
async function resolveBaseCurrencyForBudget(userId) {
  const user = await User.findByPk(userId, { attributes: ["user_id", "base_currency"] });
  if (user?.base_currency) {
    const exists = await Currency.findByPk(user.base_currency);
    if (exists) return user.base_currency;
  }
  const account = await Account.findOne({
    where: { user_id: userId },
    attributes: ["currency_code"],
  });
  if (account) return account.currency_code;
  throw new ApiError(400, "Set base currency in profile or add an account to create budgets");
}

/**
 * Parse yyyyMm (e.g. 202602) to start and end of month in UTC.
 * @returns {{ startDate: Date, endDate: Date, asOfDate: string }} asOfDate is YYYY-MM-DD for FX (last day of month)
 */
function parseYyyyMm(yyyyMm) {
  const str = String(yyyyMm);
  const year = parseInt(str.slice(0, 4), 10);
  const month = parseInt(str.slice(4, 6), 10) - 1;
  const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  const asOfDate = lastDay.toISOString().slice(0, 10);
  return { startDate, endDate, asOfDate };
}

/**
 * Convert amount from one currency to another using FX rate and minor units.
 */
function convertAmount(amountMinor, rate, fromMinorUnit, toMinorUnit) {
  const fromScale = Math.pow(10, fromMinorUnit);
  const toScale = Math.pow(10, toMinorUnit);
  return Math.round((Number(amountMinor) * Number(rate) * toScale) / fromScale);
}

/**
 * PUT budgets for a month. Create/update category budgets (idempotent).
 */
async function putBudgetMonth(userId, yyyyMm, { categoryBudgets }) {
  logger.info({ userId, yyyyMm, count: categoryBudgets?.length }, "putBudgetMonth called");

  if (userId == null) {
    throw new ApiError(400, "User ID is required");
  }

  try {
    const currencyCode = await resolveBaseCurrencyForBudget(userId);

    // Validate categories belong to user or are system
    for (const cb of categoryBudgets) {
      const cat = await Category.findOne({
        where: {
          category_id: cb.category_id,
          [Op.or]: [{ user_id: null }, { user_id: userId }],
        },
      });
      if (!cat) {
        throw new ApiError(404, `Category ${cb.category_id} not found`);
      }
    }

    const [period] = await BudgetPeriod.findOrCreate({
      where: { user_id: userId, yyyy_mm: yyyyMm },
      defaults: { user_id: userId, yyyy_mm: yyyyMm, currency_code: currencyCode },
    });

    for (const cb of categoryBudgets) {
      await Budget.upsert(
        {
          budget_period_id: period.budget_period_id,
          category_id: cb.category_id,
          amount_minor: cb.amount_minor,
        },
        { conflictFields: ["budget_period_id", "category_id"] }
      );
    }

    await createLog({
      user_id: userId,
      log_type: "audit",
      action: "budget_set_success",
      entity: "budget",
      entity_id: String(yyyyMm),
      details: { category_count: categoryBudgets.length },
    });

    logger.info({ userId, yyyyMm, count: categoryBudgets.length }, "Budgets updated");
    return await getBudgetMonth(userId, yyyyMm);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    await createLog({
      user_id: userId,
      log_type: "audit",
      action: "budget_set_fail",
      entity: "budget",
      entity_id: String(yyyyMm),
      message: err?.message?.slice(0, 200),
    });
    throw handleServerError(err, "Error setting budgets", 500);
  }
}

/**
 * GET budgets for a month.
 */
async function getBudgetMonth(userId, yyyyMm) {
  logger.info({ userId, yyyyMm }, "getBudgetMonth called");

  if (userId == null) {
    throw new ApiError(400, "User ID is required");
  }

  try {
    const period = await BudgetPeriod.findOne({
      where: { user_id: userId, yyyy_mm: yyyyMm },
      include: [
        {
          model: Budget,
          as: "budgets",
          include: [{ model: Category, as: "category", attributes: ["category_id", "name", "type"] }],
        },
      ],
    });

    if (!period) return { budgets: [], currency_code: null, yyyy_mm: yyyyMm };

    const budgets = period.budgets || [];
    return {
      budgets,
      currency_code: period.currency_code,
      yyyy_mm: period.yyyy_mm,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw handleServerError(err, "Error fetching budgets", 500);
  }
}

/**
 * DELETE a single category budget for a month.
 */
async function deleteBudgetCategory(userId, yyyyMm, categoryId) {
  logger.info({ userId, yyyyMm, categoryId }, "deleteBudgetCategory called");

  if (userId == null) {
    throw new ApiError(400, "User ID is required");
  }

  try {
    const period = await BudgetPeriod.findOne({
      where: { user_id: userId, yyyy_mm: yyyyMm },
      attributes: ["budget_period_id"],
    });

    if (!period) {
      throw new ApiError(404, "No budget period found for this month");
    }

    const deletedCount = await Budget.destroy({
      where: {
        budget_period_id: period.budget_period_id,
        category_id: categoryId,
      },
    });

    if (!deletedCount) {
      throw new ApiError(404, "Budget category not found for this month");
    }

    await createLog({
      user_id: userId,
      log_type: "audit",
      action: "budget_delete_success",
      entity: "budget",
      entity_id: `${yyyyMm}:${categoryId}`,
    });

    return await getBudgetMonth(userId, yyyyMm);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    await createLog({
      user_id: userId,
      log_type: "audit",
      action: "budget_delete_fail",
      entity: "budget",
      entity_id: `${yyyyMm}:${categoryId}`,
      message: err?.message?.slice(0, 200),
    });
    throw handleServerError(err, "Error deleting budget category", 500);
  }
}

/**
 * GET budget vs spent per category + totals.
 * Handles FX conversion for transactions with different base_currency.
 */
async function getBudgetSummary(userId, yyyyMm) {
  logger.info({ userId, yyyyMm }, "getBudgetSummary called");

  await createLog({
    user_id: userId,
    log_type: "audit",
    action: "budget_summary_view",
    entity: "budget",
    entity_id: String(yyyyMm),
  });

  if (userId == null) {
    throw new ApiError(400, "User ID is required");
  }

  try {
    const period = await BudgetPeriod.findOne({
      where: { user_id: userId, yyyy_mm: yyyyMm },
      include: [
        {
          model: Budget,
          as: "budgets",
          include: [{ model: Category, as: "category", attributes: ["category_id", "name", "type"] }],
        },
      ],
    });

    if (!period) {
      return {
        summaries: [],
        totals: { budget_minor: 0, spent_minor: 0, savings_minor: 0, remaining_minor: 0, currency_code: null },
        yyyy_mm: yyyyMm,
      };
    }

    const { startDate, endDate, asOfDate } = parseYyyyMm(yyyyMm);
    const budgetCurrency = period.currency_code;
    const budgetCurrencyRow = await Currency.findByPk(budgetCurrency);
    const currencyMinorUnitCache = new Map();
    currencyMinorUnitCache.set(budgetCurrency, budgetCurrencyRow?.minor_unit ?? 2);

    const getMinorUnit = async (currencyCode) => {
      if (currencyMinorUnitCache.has(currencyCode)) {
        return currencyMinorUnitCache.get(currencyCode);
      }
      const row = await Currency.findByPk(currencyCode);
      const minorUnit = row?.minor_unit ?? 2;
      currencyMinorUnitCache.set(currencyCode, minorUnit);
      return minorUnit;
    };

    const transactions = await Transaction.findAll({
      where: {
        user_id: userId,
        timestamp: { [Op.between]: [startDate, endDate] },
        type: { [Op.in]: ["expense", "income", "savings"] },
      },
      attributes: ["category_id", "base_currency", "amount_base_minor", "type"],
      raw: true,
    });

    const spentByCategory = {};
    const savingsByCurrency = {};
    for (const tx of transactions) {
      const catId = tx.category_id;
      if (!spentByCategory[catId]) spentByCategory[catId] = {};
      const curr = tx.base_currency;
      if (!spentByCategory[catId][curr]) spentByCategory[catId][curr] = 0;
      spentByCategory[catId][curr] += Number(tx.amount_base_minor);

      if (tx.type === "savings") {
        if (!savingsByCurrency[curr]) savingsByCurrency[curr] = 0;
        savingsByCurrency[curr] += Number(tx.amount_base_minor);
      }
    }

    const summaries = [];
    let totalBudget = 0;
    let totalSpent = 0;

    for (const budget of period.budgets) {
      const catId = budget.category_id;
      const category = budget.category;
      const budgetAmount = Number(budget.amount_minor);
      totalBudget += budgetAmount;

      let spentMinor = 0;
      const buckets = spentByCategory[catId] || {};
      for (const [curr, amountMinor] of Object.entries(buckets)) {
        if (curr === budgetCurrency) {
          spentMinor += amountMinor;
        } else {
          const rate = await getOrFetchRate(curr, budgetCurrency, asOfDate);
          const fromMinorUnit = await getMinorUnit(curr);
          const converted = convertAmount(
            amountMinor,
            rate.rate,
            fromMinorUnit,
            budgetCurrencyRow?.minor_unit ?? 2
          );
          spentMinor += converted;
        }
      }
      totalSpent += spentMinor;

      summaries.push({
        budget_id: budget.budget_id,
        category_id: catId,
        category: category,
        amount_minor: budgetAmount,
        spent_minor: spentMinor,
        remaining_minor: budgetAmount - spentMinor,
      });
    }

    let totalSavings = 0;
    for (const [curr, amountMinor] of Object.entries(savingsByCurrency)) {
      if (curr === budgetCurrency) {
        totalSavings += amountMinor;
      } else {
        const rate = await getOrFetchRate(curr, budgetCurrency, asOfDate);
        const fromMinorUnit = await getMinorUnit(curr);
        const converted = convertAmount(
          amountMinor,
          rate.rate,
          fromMinorUnit,
          budgetCurrencyRow?.minor_unit ?? 2
        );
        totalSavings += converted;
      }
    }

    return {
      summaries,
      totals: {
        budget_minor: totalBudget,
        spent_minor: totalSpent,
        savings_minor: totalSavings,
        remaining_minor: totalBudget - totalSpent,
        currency_code: budgetCurrency,
      },
      yyyy_mm: yyyyMm,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw handleServerError(err, "Error fetching budget summary", 500);
  }
}

export { putBudgetMonth, getBudgetMonth, getBudgetSummary, deleteBudgetCategory };
