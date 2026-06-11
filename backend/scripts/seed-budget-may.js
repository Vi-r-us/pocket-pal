/**
 * Seed monthly category budgets for May (or any YYYYMM) via putBudgetMonth.
 *
 * Usage (from backend/):
 *   node -r dotenv/config scripts/seed-budget-may.js
 *   node -r dotenv/config scripts/seed-budget-may.js 7 202605
 *
 * Args: [userId=7] [yyyyMm=202605]
 */

import "dotenv/config";
import { Op } from "sequelize";
import { sequelize } from "../src/db/sequelize.js";
import { Category } from "../src/models/index.js";
import { putBudgetMonth } from "../src/services/budget.service.js";

const BUDGET_PLAN = [
  // Income
  { name: "Salary / Wages", type: "income", major: 85_000 },
  { name: "Freelance / Side Hustle", type: "income", major: 15_000 },
  { name: "Interest", type: "income", major: 2_000 },

  // Expense
  { name: "Housing (Rent/Mortgage)", type: "expense", major: 22_000 },
  { name: "Utilities", type: "expense", major: 3_500 },
  { name: "Groceries", type: "expense", major: 12_000 },
  { name: "Transportation", type: "expense", major: 4_000 },
  { name: "Fuel", type: "expense", major: 3_000 },
  { name: "Dining Out", type: "expense", major: 6_000 },
  { name: "Entertainment", type: "expense", major: 2_500 },
  { name: "Subscriptions", type: "expense", major: 1_200 },
  { name: "Healthcare", type: "expense", major: 2_000 },
  { name: "Personal Care", type: "expense", major: 1_500 },
  { name: "Shopping", type: "expense", major: 5_000 },

  // Savings
  { name: "Emergency Fund", type: "savings", major: 10_000 },
  { name: "Mutual Funds / SIP", type: "savings", major: 15_000 },
  { name: "Retirement", type: "savings", major: 8_000 },
];

function parseArgs() {
  const userId = Number(process.argv[2]) || 7;
  const yyyyMm = Number(process.argv[3]) || 202605;
  return { userId, yyyyMm };
}

function majorToMinor(major) {
  return Math.round(Number(major) * 100);
}

async function resolveCategoryBudgets(userId, plan) {
  const categoryBudgets = [];
  const missing = [];

  for (const row of plan) {
    const category = await Category.findOne({
      where: {
        name: row.name,
        type: row.type,
        is_active: true,
        [Op.or]: [{ user_id: null }, { user_id: userId }],
      },
      attributes: ["category_id", "name", "type"],
    });

    if (!category) {
      missing.push(`${row.name} (${row.type})`);
      continue;
    }

    categoryBudgets.push({
      category_id: category.getDataValue("category_id"),
      amount_minor: majorToMinor(row.major),
    });
  }

  return { categoryBudgets, missing };
}

async function main() {
  const { userId, yyyyMm } = parseArgs();

  const { categoryBudgets, missing } = await resolveCategoryBudgets(userId, BUDGET_PLAN);

  if (missing.length > 0) {
    console.error("Missing categories (run migrations/seeders first):");
    missing.forEach((name) => console.error(`  - ${name}`));
    process.exitCode = 1;
    return;
  }

  if (categoryBudgets.length === 0) {
    console.error("No category budgets resolved.");
    process.exitCode = 1;
    return;
  }

  console.log(
    `Seeding ${categoryBudgets.length} budget row(s) for user=${userId} month=${yyyyMm}…`,
  );

  const result = await putBudgetMonth(userId, yyyyMm, { categoryBudgets });

  const totalBudgetMinor = result?.totals?.budget_minor ?? null;
  console.log("Done.");
  console.log(`  Month: ${yyyyMm}`);
  console.log(`  Categories: ${categoryBudgets.length}`);
  if (totalBudgetMinor != null) {
    console.log(`  Total budget (minor): ${totalBudgetMinor}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
