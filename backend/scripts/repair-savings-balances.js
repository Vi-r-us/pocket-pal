/**
 * One-time repair for legacy savings transactions that incorrectly credited source accounts.
 *
 * Before savings modes, createTransaction treated savings like income (+amount on the source account).
 * This script undoes that false credit and tags rows as allocate-mode primary legs.
 *
 * Usage (from backend/):
 *   node -r dotenv/config scripts/repair-savings-balances.js
 *   node -r dotenv/config scripts/repair-savings-balances.js --dry-run
 *
 * Skips mirror transfer legs (metadata.transfer_leg === "mirror").
 * Run once after deploying savings allocate/transfer support.
 */

import "dotenv/config";
import { Op } from "sequelize";
import { sequelize } from "../src/db/sequelize.js";
import { Account, Transaction } from "../src/models/index.js";
import { buildAllocateMetadata, getTransferLeg } from "../src/utils/savingsTransaction.js";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const savingsRows = await Transaction.findAll({
    where: { type: "savings" },
    attributes: ["transaction_id", "user_id", "account_id", "amount_minor", "metadata"],
    order: [["transaction_id", "ASC"]],
  });

  const candidates = savingsRows.filter((row) => getTransferLeg(row.metadata) !== "mirror");

  console.log(
    dryRun ? "[DRY RUN] " : "",
    `Found ${savingsRows.length} savings transaction(s); ${candidates.length} to repair (excluding mirror legs).`,
  );

  let repaired = 0;
  let skipped = 0;
  const errors = [];

  for (const row of candidates) {
    const amountMinor = Number(row.amount_minor);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      skipped += 1;
      continue;
    }

    const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? { ...row.metadata }
      : {};
    const needsMetadata =
      metadata.savings_mode !== "allocate" && metadata.savings_mode !== "transfer";
    const nextMetadata = needsMetadata
      ? { ...buildAllocateMetadata(), ...metadata, savings_mode: "allocate", transfer_leg: "primary" }
      : metadata;

    try {
      if (dryRun) {
        console.log(
          `  would repair tx=${row.transaction_id} account=${row.account_id} −${amountMinor} minor`,
        );
        repaired += 1;
        continue;
      }

      await sequelize.transaction(async (t) => {
        const account = await Account.findOne({
          where: { account_id: row.account_id, user_id: row.user_id },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (!account) {
          throw new Error(`Account ${row.account_id} not found for user ${row.user_id}`);
        }

        await account.update(
          { balance_minor: Number(account.balance_minor) - amountMinor },
          { transaction: t },
        );

        if (needsMetadata) {
          await row.update({ metadata: nextMetadata }, { transaction: t });
        }
      });

      repaired += 1;
    } catch (error) {
      errors.push({ transaction_id: row.transaction_id, message: error?.message || String(error) });
    }
  }

  console.log(`Repaired: ${repaired}, skipped: ${skipped}, errors: ${errors.length}`);
  if (errors.length) {
    errors.slice(0, 10).forEach((entry) => {
      console.error(`  tx ${entry.transaction_id}: ${entry.message}`);
    });
    process.exitCode = 1;
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
