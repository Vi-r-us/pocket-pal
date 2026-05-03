// Name of the database
export const DB_NAME = "pocket_pal_db";
// Valid category types 
export const VALID_CATEGORY_TYPES = ["expense", "income", "savings"];
// Valid account types
export const VALID_ACCOUNT_TYPES = ["bank", "cash", "savings", "credit_card"];

// Valid transaction types
export const VALID_TRANSACTION_TYPES = ["income", "expense", "savings"];
export const VALID_TRANSACTION_TYPE_INPUTS = [...VALID_TRANSACTION_TYPES, "deposit", "withdrawal"];
export const TRANSACTION_TYPE_NORMALIZATION_MAP = {
  deposit: "income",
  withdrawal: "expense",
  income: "income",
  expense: "expense",
  savings: "savings",
};
// Valid transaction sources
export const VALID_TRANSACTION_SOURCES = ["manual", "recurring", "transfer", "external"];

// Budget FX conversion policy: "period_end" (use last day of month) or "transaction_date"
export const BUDGET_FX_AS_OF = process.env.BUDGET_FX_AS_OF || "period_end";

// Goal statuses
export const GOAL_STATUSES = ["active", "archived"];