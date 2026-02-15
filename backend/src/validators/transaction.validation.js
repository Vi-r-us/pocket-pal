import Joi from "joi";
import { VALID_TRANSACTION_TYPES, VALID_TRANSACTION_SOURCES } from "../constants/constants.js";

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
    .valid(...VALID_TRANSACTION_TYPES)
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
  timestamp: Joi.date().optional(),
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
    .valid(...VALID_TRANSACTION_TYPES)
    .optional()
    .messages({
      "any.only": `Type must be one of: ${VALID_TRANSACTION_TYPES.join(", ")}`,
    }),
  date_from: Joi.date().optional().messages({
    "date.base": "date_from must be a valid date",
  }),
  date_to: Joi.date().optional().messages({
    "date.base": "date_to must be a valid date",
  }),
}).options({ convert: true });

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
  timestamp: Joi.date().optional().messages({
    "date.base": "timestamp must be a valid date",
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

export {
  validateCreateTransaction,
  validateFetchTransactions,
  validateTransactionIdQuery,
  validateUpdateTransaction,
};
