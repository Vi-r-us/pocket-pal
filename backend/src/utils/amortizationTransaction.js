import { getTransactionMetadata } from "./savingsTransaction.js";

/**
 * Build metadata for one slice of an amortized (spread) expense.
 * @param {Object} args
 * @param {string} args.groupId - shared id linking all slices of the spread
 * @param {number} args.index - 0-based slice index
 * @param {number} args.count - total number of slices
 * @param {number} args.totalMinor - original full amount in minor units
 * @param {string} args.startMonth - first attributed month as YYYY-MM
 */
export function buildAmortizationMetadata({ groupId, index, count, totalMinor, startMonth }) {
  return {
    amortization: {
      group_id: groupId,
      index,
      count,
      total_minor: totalMinor,
      start_month: startMonth,
    },
  };
}

/** Return the amortization group id for a transaction or raw metadata object (null if not amortized). */
export function getAmortizationGroupId(transactionOrMetadata) {
  const metadata =
    transactionOrMetadata?.amortization != null
      ? transactionOrMetadata
      : getTransactionMetadata(transactionOrMetadata);
  const amortization = metadata?.amortization;
  if (!amortization || typeof amortization !== "object") return null;
  return amortization.group_id ?? null;
}
