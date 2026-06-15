/**
 * Seed mock transactions for local/testing via the same path as the API (createTransaction).
 *
 * Usage (from backend/):
 *   node -r dotenv/config scripts/seed-mock-transactions.js
 *   node -r dotenv/config scripts/seed-mock-transactions.js 150 7 1
 *
 * Args: [count=100] [userId=7] [accountId=1]
 *
 * Env: same as the app (DATABASE_URL or DB_*). Requires network if account currency ≠ user base
 *      and Frankfurter must fetch cross rates (first run per calendar day may call the API).
 */

import "dotenv/config";
import { Op } from "sequelize";
import { sequelize } from "../src/db/sequelize.js";
import { Account, Category } from "../src/models/index.js";
import { createTransaction } from "../src/services/transaction.service.js";

const SOURCES = ["manual", "recurring", "transfer", "external"];

function parseArgs() {
  const count = Math.max(1, Math.min(10_000, Number(process.argv[2]) || 100));
  const userId = Number(process.argv[3]) || 7;
  const accountId = Number(process.argv[4]) || 1;
  return { count, userId, accountId };
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

function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function randomTimestampInLastTwoYears() {
  const end = Date.now();
  const twoYearsMs = 2 * 365.25 * 24 * 60 * 60 * 1000;
  const start = end - twoYearsMs;
  return new Date(randomInt(start, end));
}

function randomMinorAmount(catType) {
  if (catType === "income") {
    return randomInt(50_000, 500_000);
  }
  if (catType === "expense") {
    return randomInt(500, 120_000);
  }
  return randomInt(1_000, 200_000);
}

async function main() {
  const { count, userId, accountId } = parseArgs();

  const account = await Account.findOne({
    where: { account_id: accountId, user_id: userId },
  });
  if (!account) {
    console.error(`No account found for account_id=${accountId} and user_id=${userId}`);
    process.exitCode = 1;
    return;
  }

  const categories = await Category.findAll({
    where: {
      is_active: true,
      [Op.or]: [{ user_id: null }, { user_id: userId }],
    },
    attributes: ["category_id", "type"],
  });

  if (categories.length === 0) {
    console.error("No categories available (system + user). Run migrations/seeders first.");
    process.exitCode = 1;
    return;
  }

  console.log(
    `Seeding ${count} mock transaction(s): user=${userId} account=${accountId} (${account.currency_code})…`,
  );

  let ok = 0;
  const errors = [];

  for (let i = 0; i < count; i++) {
    const cat = categories[randomInt(0, categories.length - 1)];
    const type = categoryTypeToTransactionType(cat.getDataValue("type"));
    const timestamp = randomTimestampInLastTwoYears();
    const payload = {
      account_id: accountId,
      category_id: cat.getDataValue("category_id"),
      amount_minor: randomMinorAmount(cat.getDataValue("type")),
      type,
      source: SOURCES[randomInt(0, SOURCES.length - 1)],
      description: `Mock seed ${i + 1}/${count}`,
      timestamp,
      ...(type === "savings" ? { savings_mode: "allocate" } : {}),
    };

    try {
      await createTransaction(userId, payload);
      ok += 1;
      if ((i + 1) % 25 === 0 || i === count - 1) {
        console.log(`  …${ok} created`);
      }
    } catch (e) {
      errors.push({ i: i + 1, message: e?.message || String(e) });
    }
  }

  if (errors.length) {
    console.error(`Completed with ${errors.length} error(s), ${ok} succeeded.`);
    errors.slice(0, 5).forEach((e) => console.error(`  row ${e.i}: ${e.message}`));
    if (errors.length > 5) {
      console.error(`  …and ${errors.length - 5} more`);
    }
    process.exitCode = 1;
  } else {
    console.log(`Done. Created ${ok} transaction(s).`);
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
