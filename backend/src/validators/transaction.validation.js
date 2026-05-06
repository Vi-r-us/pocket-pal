import Joi from "joi";
import { VALID_TRANSACTION_TYPES, VALID_TRANSACTION_TYPE_INPUTS, VALID_TRANSACTION_SOURCES } from "../constants/constants.js";

/** Schema for creating a transaction. Currency comes from account if not provided. */
const createTransactionSchema = Joi.object({
  account_id: Joi.number().integer().positive().required().messages({
    "number.base": "Account ID must be a number",
    "any.required": "Account ID is required",
  }),
  category_id: Joi.number().integer().positive().required().messages({
    "number.base": "Category ID must be a number",
    "any.required": "Category ID is required",
  }),
  amount_minor: Joi.number().integer().required().messages({
    "number.base": "Amount (minor units) must be a number",
    "any.required": "Amount is required",
  }),
  currency: Joi.string().trim().uppercase().length(3).optional().messages({
    "string.length": "Currency code must be 3 characters",
  }),
  type: Joi.string()
    .lowercase()
    .trim()
    .valid(...VALID_TRANSACTION_TYPE_INPUTS)
    .required()
    .messages({
      "any.only": `Type must be one of: ${VALID_TRANSACTION_TYPES.join(", ")}`,
      "any.required": "Type is required",
    }),
  source: Joi.string()
    .lowercase()
    .trim()
    .valid(...VALID_TRANSACTION_SOURCES)
    .optional()
    .default("manual")
    .messages({
      "any.only": `Source must be one of: ${VALID_TRANSACTION_SOURCES.join(", ")}`,
    }),
  description: Joi.string().trim().allow("").optional(),
  metadata: Joi.object().optional(),
  timestamp: Joi.date().iso().optional().messages({
    "date.format": "timestamp must be in ISO 8601 format (e.g. 2026-02-16 or 2026-02-16T10:30:00.000Z)",
  }),
}).options({ convert: true });

/** Used for GET list: optional filters (query params). */
const fetchTransactionsSchema = Joi.object({
  account_id: Joi.number().integer().positive().optional().messages({
    "number.base": "Account ID must be a number",
  }),
  category_id: Joi.number().integer().positive().optional().messages({
    "number.base": "Category ID must be a number",
  }),
  type: Joi.string()
    .lowercase()
    .trim()
    .valid(...VALID_TRANSACTION_TYPE_INPUTS)
    .optional()
    .messages({
      "any.only": `Type must be one of: ${VALID_TRANSACTION_TYPES.join(", ")}`,
    }),
  source: Joi.string()
    .lowercase()
    .trim()
    .valid(...VALID_TRANSACTION_SOURCES)
    .optional()
    .messages({
      "any.only": `Source must be one of: ${VALID_TRANSACTION_SOURCES.join(", ")}`,
    }),
  amount_min: Joi.number().integer().optional().messages({
    "number.base": "amount_min must be a number",
    "number.integer": "amount_min must be an integer",
  }),
  amount_max: Joi.number().integer().optional().messages({
    "number.base": "amount_max must be a number",
    "number.integer": "amount_max must be an integer",
  }),
  q: Joi.string().trim().max(120).optional().messages({
    "string.max": "Search query must be at most 120 characters",
  }),
  date_from: Joi.date().optional().messages({
    "date.base": "date_from must be a valid date",
  }),
  date_to: Joi.date().optional().messages({
    "date.base": "date_to must be a valid date",
  }),
  page: Joi.number().integer().min(1).optional().default(1).messages({
    "number.base": "page must be a number",
    "number.integer": "page must be an integer",
    "number.min": "page must be at least 1",
  }),
  limit: Joi.number().integer().min(1).max(100).optional().default(20).messages({
    "number.base": "limit must be a number",
    "number.integer": "limit must be an integer",
    "number.min": "limit must be at least 1",
    "number.max": "limit must be at most 100",
  }),
  sort_by: Joi.string().trim().valid("timestamp", "amount_minor").optional().default("timestamp").messages({
    "any.only": "sort_by must be one of: timestamp, amount_minor",
  }),
  sort_order: Joi.string().trim().lowercase().valid("asc", "desc").optional().default("desc").messages({
    "any.only": "sort_order must be one of: asc, desc",
  }),
})
  .custom((value, helpers) => {
    if (value.date_from && value.date_to && new Date(value.date_from) > new Date(value.date_to)) {
      return helpers.error("any.invalid", { message: "date_from must be less than or equal to date_to" });
    }
    if (value.amount_min != null && value.amount_max != null && value.amount_min > value.amount_max) {
      return helpers.error("any.invalid", { message: "amount_min must be less than or equal to amount_max" });
    }
    return value;
  })
  .messages({
    "any.invalid": "{{#message}}",
  })
  .options({ convert: true });

/** Used for get-one, update, delete: ?id= (transaction_id). */
const transactionIdQuerySchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "Transaction ID must be a number",
    "number.integer": "Transaction ID must be an integer",
    "number.positive": "Transaction ID must be a positive number",
    "any.required": "Transaction ID is required",
  }),
}).options({ convert: true });

/** Used for PATCH: only safe fields; at least one required. */
const updateTransactionSchema = Joi.object({
  account_id: Joi.number().integer().positive().optional().messages({
    "number.base": "Account ID must be a number",
  }),
  amount_minor: Joi.number().integer().optional().messages({
    "number.base": "Amount (minor units) must be a number",
  }),
  currency: Joi.string().trim().uppercase().length(3).optional().messages({
    "string.length": "Currency code must be 3 characters",
  }),
  type: Joi.string()
    .lowercase()
    .trim()
    .valid(...VALID_TRANSACTION_TYPE_INPUTS)
    .optional()
    .messages({
      "any.only": `Type must be one of: ${VALID_TRANSACTION_TYPES.join(", ")}`,
    }),
  description: Joi.string().trim().allow("").optional(),
  metadata: Joi.object().optional(),
  source: Joi.string()
    .lowercase()
    .trim()
    .valid(...VALID_TRANSACTION_SOURCES)
    .optional()
    .messages({
      "any.only": `Source must be one of: ${VALID_TRANSACTION_SOURCES.join(", ")}`,
    }),
  category_id: Joi.number().integer().positive().optional().messages({
    "number.base": "Category ID must be a number",
  }),
  timestamp: Joi.date().iso().optional().messages({
    "date.format": "timestamp must be in ISO 8601 format (e.g. 2026-02-16 or 2026-02-16T10:30:00.000Z)",
  }),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  })
  .options({ convert: true });

const validateCreateTransaction = (data) => {
  return createTransactionSchema.validate(data, { abortEarly: false });
};

const validateFetchTransactions = (data) => {
  return fetchTransactionsSchema.validate(data, { abortEarly: false });
};

const validateTransactionIdQuery = (data) => {
  return transactionIdQuerySchema.validate(data, { abortEarly: false });
};

const validateUpdateTransaction = (data) => {
  return updateTransactionSchema.validate(data, { abortEarly: false });
};

export { validateCreateTransaction, validateFetchTransactions, validateTransactionIdQuery, validateUpdateTransaction };
