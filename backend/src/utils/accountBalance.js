import { TRANSACTION_TYPE_NORMALIZATION_MAP } from "../constants/constants.js";
import { getSavingsMode, getTransactionMetadata, getTransferLeg } from "./savingsTransaction.js";

export function normalizeTransactionType(type) {
  const normalized = TRANSACTION_TYPE_NORMALIZATION_MAP[String(type || "").toLowerCase()];
  return normalized || type;
}

export function getBalanceDelta(type, amountMinor, context = {}) {
  const normalizedType = normalizeTransactionType(type);
  const amount = Number(amountMinor) || 0;
  if (normalizedType === "expense") return -amount;
  if (normalizedType === "income") return amount;
  if (normalizedType === "savings") {
    const savingsMode = context.savings_mode ?? getSavingsMode(context.metadata);
    const transferLeg = context.transfer_leg ?? getTransferLeg(context.metadata);
    if (savingsMode === "allocate") return 0;
    if (savingsMode === "transfer") {
      return transferLeg === "mirror" ? amount : -amount;
    }
    return 0;
  }
  return amount;
}

export function getBalanceDeltaFromTransaction(transaction) {
  const metadata = getTransactionMetadata(transaction);
  return getBalanceDelta(transaction.type, transaction.amount_minor, {
    savings_mode: getSavingsMode(metadata),
    transfer_leg: getTransferLeg(metadata),
    metadata,
  });
}

export function computeBalanceFromTransactions(openingBalanceMinor, transactions) {
  const opening = Number(openingBalanceMinor) || 0;
  let deltaSum = 0;
  for (const tx of transactions) {
    deltaSum += getBalanceDeltaFromTransaction(tx);
  }
  return opening + deltaSum;
}
