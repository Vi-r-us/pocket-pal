export const VALID_SAVINGS_MODES = ["allocate", "transfer"];

export function getTransactionMetadata(tx) {
  const raw = tx?.metadata ?? tx?.get?.({ plain: true })?.metadata;
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}

export function getTransferLeg(metadata) {
  const meta = metadata?.transfer_leg != null ? metadata : getTransactionMetadata(metadata);
  return meta.transfer_leg ?? null;
}

export function getSavingsMode(metadata, fallback = "allocate") {
  const meta = metadata?.savings_mode != null ? metadata : getTransactionMetadata(metadata);
  if (meta.savings_mode === "transfer") return "transfer";
  if (meta.savings_mode === "allocate") return "allocate";
  return fallback;
}

/** Exclude mirror legs from budget / goal / summary savings totals. */
export function isPrimarySavingsContribution(tx) {
  const metadata = getTransactionMetadata(tx);
  return metadata.transfer_leg !== "mirror";
}

export function buildAllocateMetadata() {
  return {
    savings_mode: "allocate",
    transfer_leg: "primary",
  };
}

export function isExternalTransferSavings(metadata) {
  const meta = getTransactionMetadata(metadata);
  return meta.savings_mode === "transfer" && meta.transfer_destination === "external";
}

export function isInternalTransferSavings(metadata) {
  const meta = getTransactionMetadata(metadata);
  return meta.savings_mode === "transfer" && meta.destination_account_id != null;
}

export function buildExternalTransferMetadata() {
  return {
    savings_mode: "transfer",
    transfer_leg: "primary",
    transfer_destination: "external",
  };
}

export function buildPrimaryTransferMetadata({ transferGroupId, destinationAccountId }) {
  return {
    savings_mode: "transfer",
    transfer_leg: "primary",
    transfer_destination: "internal",
    transfer_group_id: transferGroupId,
    destination_account_id: destinationAccountId,
  };
}

export function buildMirrorTransferMetadata({ transferGroupId, primaryTransactionId }) {
  return {
    savings_mode: "transfer",
    transfer_leg: "mirror",
    transfer_group_id: transferGroupId,
    primary_transaction_id: primaryTransactionId,
  };
}
