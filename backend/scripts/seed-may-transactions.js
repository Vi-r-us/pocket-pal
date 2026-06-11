/**
 * Seed planned May transactions via createTransaction (same path as the API).
 *
 * Usage (from backend/):
 *   node -r dotenv/config scripts/seed-may-transactions.js
 *   node -r dotenv/config scripts/seed-may-transactions.js 7 1 2026
 *
 * Args: [userId=7] [accountId=1] [year=2026]
 */

import "dotenv/config";
import { Op } from "sequelize";
import { sequelize } from "../src/db/sequelize.js";
import { Account, Category } from "../src/models/index.js";
import { createTransaction } from "../src/services/transaction.service.js";

const TRANSACTION_PLAN = [
  // ---- Income ----
  { name: "Salary / Wages", type: "income", major: 85_000, day: 1, description: "May salary" },
  { name: "Freelance / Side Hustle", type: "income", major: 9_000, day: 12, description: "Freelance project milestone" },
  { name: "Freelance / Side Hustle", type: "income", major: 8_500, day: 24, description: "Freelance retainer" },
  { name: "Interest", type: "income", major: 1_950, day: 28, description: "Savings account interest" },
  { name: "Bonus", type: "income", major: 20_000, day: 15, description: "Quarterly performance bonus" },

  // ---- Expense: on/under budget ----
  { name: "Housing (Rent/Mortgage)", type: "expense", major: 22_000, day: 2, description: "May rent" },

  { name: "Utilities", type: "expense", major: 1_800, day: 6, description: "Electricity bill" },
  { name: "Utilities", type: "expense", major: 1_300, day: 18, description: "Water + gas" },

  { name: "Groceries", type: "expense", major: 2_600, day: 3, description: "Weekly groceries" },
  { name: "Groceries", type: "expense", major: 2_300, day: 10, description: "Weekly groceries" },
  { name: "Groceries", type: "expense", major: 2_800, day: 17, description: "Weekly groceries" },
  { name: "Groceries", type: "expense", major: 1_900, day: 23, description: "Weekly groceries" },
  { name: "Groceries", type: "expense", major: 1_800, day: 29, description: "Weekly groceries" },

  { name: "Transportation", type: "expense", major: 1_400, day: 5, description: "Metro pass" },
  { name: "Transportation", type: "expense", major: 1_200, day: 16, description: "Cab rides" },
  { name: "Transportation", type: "expense", major: 900, day: 26, description: "Auto rides" },

  { name: "Fuel", type: "expense", major: 1_600, day: 8, description: "Petrol" },
  { name: "Fuel", type: "expense", major: 1_600, day: 22, description: "Petrol" },

  { name: "Dining Out", type: "expense", major: 1_200, day: 4, description: "Dinner with friends" },
  { name: "Dining Out", type: "expense", major: 1_500, day: 13, description: "Weekend brunch" },
  { name: "Dining Out", type: "expense", major: 1_100, day: 20, description: "Lunch out" },
  { name: "Dining Out", type: "expense", major: 1_600, day: 27, description: "Anniversary dinner" },

  { name: "Entertainment", type: "expense", major: 800, day: 9, description: "Movie night" },
  { name: "Entertainment", type: "expense", major: 1_400, day: 21, description: "Concert tickets" },

  { name: "Subscriptions", type: "expense", major: 199, day: 1, description: "Music subscription" },
  { name: "Subscriptions", type: "expense", major: 499, day: 1, description: "Streaming subscription" },
  { name: "Subscriptions", type: "expense", major: 502, day: 7, description: "Cloud storage + news" },

  { name: "Personal Care", type: "expense", major: 700, day: 11, description: "Haircut" },
  { name: "Personal Care", type: "expense", major: 700, day: 25, description: "Grooming essentials" },

  // ---- Expense: over-budget outliers ----
  { name: "Healthcare", type: "expense", major: 9_500, day: 14, description: "Emergency room visit + meds" },

  { name: "Shopping", type: "expense", major: 12_000, day: 19, description: "New laptop" },
  { name: "Shopping", type: "expense", major: 4_500, day: 30, description: "Clothing + accessories" },

  // ---- Expense: unbudgeted (no budget row) ----
  { name: "Travel", type: "expense", major: 18_000, day: 16, description: "Flight tickets - weekend trip" },
  { name: "Travel", type: "expense", major: 7_000, day: 17, description: "Hotel stay" },
  { name: "Insurance", type: "expense", major: 6_500, day: 5, description: "Health insurance premium" },

  // ---- Savings ----
  { name: "Emergency Fund", type: "savings", major: 10_000, day: 2, description: "Monthly emergency fund top-up" },
  { name: "Mutual Funds / SIP", type: "savings", major: 15_000, day: 3, description: "Monthly SIP" },
  { name: "Retirement", type: "savings", major: 8_000, day: 3, description: "Retirement contribution" },
];

function parseArgs() {
  const userId = Number(process.argv[2]) || 7;
  const accountId = Number(process.argv[3]) || 1;
  const year = Number(process.argv[4]) || 2026;
  return { userId, accountId, year };
}

function categoryTypeToTransactionType(catType) {
  switch (catType) {
    case "income":
      return "deposit";
    case "expense":
      return "withdrawal";
    case "savings":
      return "savings";
    default:
      throw new Error(`Unknown category type: ${catType}`);
  }
}

function majorToMinor(major) {
  return Math.round(Number(major) * 100);
}

function mayTimestamp(year, day) {
  return new Date(Date.UTC(year, 4, day, 12, 0, 0, 0));
}

async function resolveCategory(userId, name, type) {
  return Category.findOne({
    where: {
      name,
      type,
      is_active: true,
      [Op.or]: [{ user_id: null }, { user_id: userId }],
    },
    attributes: ["category_id", "name", "type"],
  });
}

async function main() {
  const { userId, accountId, year } = parseArgs();

  const account = await Account.findOne({
    where: { account_id: accountId, user_id: userId },
  });
  if (!account) {
    console.error(`No account found for account_id=${accountId} and user_id=${userId}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Seeding ${TRANSACTION_PLAN.length} May ${year} transaction(s): user=${userId} account=${accountId} (${account.currency_code})…`,
  );

  let ok = 0;
  const errors = [];

  for (let i = 0; i < TRANSACTION_PLAN.length; i++) {
    const row = TRANSACTION_PLAN[i];
    const category = await resolveCategory(userId, row.name, row.type);

    if (!category) {
      errors.push({
        i: i + 1,
        message: `Category not found: ${row.name} (${row.type})`,
      });
      continue;
    }

    const payload = {
      account_id: accountId,
      category_id: category.getDataValue("category_id"),
      amount_minor: majorToMinor(row.major),
      type: categoryTypeToTransactionType(row.type),
      source: "manual",
      description: row.description,
      timestamp: mayTimestamp(year, row.day),
    };

    try {
      await createTransaction(userId, payload);
      ok += 1;
      if ((i + 1) % 10 === 0 || i === TRANSACTION_PLAN.length - 1) {
        console.log(`  …${ok} created`);
      }
    } catch (error) {
      errors.push({
        i: i + 1,
        message: error?.message || String(error),
        description: row.description,
      });
    }
  }

  if (errors.length) {
    console.error(`Completed with ${errors.length} error(s), ${ok} succeeded.`);
    errors.slice(0, 8).forEach((entry) => {
      console.error(`  row ${entry.i}: ${entry.message}${entry.description ? ` (${entry.description})` : ""}`);
    });
    if (errors.length > 8) {
      console.error(`  …and ${errors.length - 8} more`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Done. Created ${ok} transaction(s) for May ${year}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
