import Joi from "joi";
import { capitalizeTitleCase } from "../utils/sanitize.js";
import { VALID_ACCOUNT_TYPES } from "../constants/constants.js";

/**
 * Joi custom type: normalizes string to title case (e.g. "my account" -> "My Account").
 */
const titleCase = Joi.string().custom((value, _helpers) => {
  return capitalizeTitleCase(value.trim());
}, "title case sanitization");

/** Used for GET list: optional type and is_active (query params). */
const fetchAccountsSchema = Joi.object({
  type: Joi.string()
    .lowercase()
    .trim()
    .optional()
    .valid(...VALID_ACCOUNT_TYPES)
    .messages({
      "any.only": `Type must be one of: ${VALID_ACCOUNT_TYPES.join(", ")}`,
    }),
  is_active: Joi.boolean().optional().messages({
    "boolean.base": "is_active must be true or false",
  }),
  q: Joi.string().trim().max(120).optional().messages({
    "string.max": "Search query must be at most 120 characters",
  }),
  page: Joi.number().integer().min(1).optional().messages({
    "number.base": "page must be a number",
    "number.integer": "page must be an integer",
    "number.min": "page must be at least 1",
  }),
  limit: Joi.number().integer().min(1).max(100).optional().messages({
    "number.base": "limit must be a number",
    "number.integer": "limit must be an integer",
    "number.min": "limit must be at least 1",
    "number.max": "limit must be at most 100",
  }),
  sort_by: Joi.string()
    .trim()
    .valid("name", "type", "balance_minor", "display_order", "created_at", "updated_at")
    .optional()
    .messages({
      "any.only": "sort_by must be one of: name, type, balance_minor, display_order, created_at, updated_at",
    }),
  sort_order: Joi.string().trim().lowercase().valid("asc", "desc").optional().messages({
    "any.only": "sort_order must be one of: asc, desc",
  }),
}).options({ convert: true });

/** Used for POST create: name, type, currency_code required. */
const createAccountSchema = Joi.object({
  name: titleCase.required().messages({
    "string.empty": "Name is required",
    "any.required": "Name is required",
  }),
  type: Joi.string()
    .lowercase()
    .trim()
    .valid(...VALID_ACCOUNT_TYPES)
    .required()
    .messages({
      "any.only": `Type must be one of: ${VALID_ACCOUNT_TYPES.join(", ")}`,
      "string.empty": "Type is required",
      "any.required": "Type is required",
    }),
  currency_code: Joi.string()
    .trim()
    .uppercase()
    .length(3)
    .required()
    .messages({
      "string.length": "Currency code must be 3 characters",
      "any.required": "Currency code is required",
    }),
  institution_name: Joi.string().trim().max(120).optional().messages({
    "string.max": "Institution name must be at most 120 characters",
  }),
  account_number_last4: Joi.string().trim().pattern(/^\d{4}$/).optional().messages({
    "string.pattern.base": "Account number last4 must be exactly 4 digits",
  }),
  opening_balance_minor: Joi.number().integer().optional().default(0).messages({
    "number.base": "Opening balance (minor units) must be a number",
    "number.integer": "Opening balance (minor units) must be an integer",
  }),
  notes: Joi.string().trim().max(1000).allow("").optional().messages({
    "string.max": "Notes must be at most 1000 characters",
  }),
  include_in_net_worth: Joi.boolean().optional().default(true).messages({
    "boolean.base": "include_in_net_worth must be true or false",
  }),
  display_order: Joi.number().integer().min(0).optional().default(0).messages({
    "number.base": "display_order must be a number",
    "number.integer": "display_order must be an integer",
    "number.min": "display_order must be at least 0",
  }),
  icon_key: Joi.string().trim().max(64).optional().messages({
    "string.max": "icon_key must be at most 64 characters",
  }),
  credit_limit_minor: Joi.number().integer().min(0).optional().messages({
    "number.base": "Credit limit (minor units) must be a number",
    "number.integer": "Credit limit (minor units) must be an integer",
    "number.min": "Credit limit (minor units) must be at least 0",
  }),
  statement_day: Joi.number().integer().min(1).max(31).optional().messages({
    "number.base": "statement_day must be a number",
    "number.integer": "statement_day must be an integer",
    "number.min": "statement_day must be at least 1",
    "number.max": "statement_day must be at most 31",
  }),
  payment_due_day: Joi.number().integer().min(1).max(31).optional().messages({
    "number.base": "payment_due_day must be a number",
    "number.integer": "payment_due_day must be an integer",
    "number.min": "payment_due_day must be at least 1",
    "number.max": "payment_due_day must be at most 31",
  }),
  is_active: Joi.boolean().optional().messages({
    "boolean.base": "is_active must be true or false",
  }),
}).options({ convert: true });

/** Used for PATCH update: at least one of name, type, currency_code, is_active. */
const updateAccountSchema = Joi.object({
  name: titleCase.optional(),
  type: Joi.string()
    .lowercase()
    .trim()
    .valid(...VALID_ACCOUNT_TYPES)
    .optional()
    .messages({
      "any.only": `Type must be one of: ${VALID_ACCOUNT_TYPES.join(", ")}`,
    }),
  currency_code: Joi.string()
    .trim()
    .uppercase()
    .length(3)
    .optional()
    .messages({
      "string.length": "Currency code must be 3 characters",
    }),
  is_active: Joi.boolean().optional().messages({
    "boolean.base": "is_active must be true or false",
  }),
  institution_name: Joi.string().trim().max(120).optional().allow("").messages({
    "string.max": "Institution name must be at most 120 characters",
  }),
  account_number_last4: Joi.string().trim().pattern(/^\d{4}$/).optional().allow("").messages({
    "string.pattern.base": "Account number last4 must be exactly 4 digits",
  }),
  opening_balance_minor: Joi.number().integer().optional().messages({
    "number.base": "Opening balance (minor units) must be a number",
    "number.integer": "Opening balance (minor units) must be an integer",
  }),
  notes: Joi.string().trim().max(1000).allow("").optional().messages({
    "string.max": "Notes must be at most 1000 characters",
  }),
  include_in_net_worth: Joi.boolean().optional().messages({
    "boolean.base": "include_in_net_worth must be true or false",
  }),
  display_order: Joi.number().integer().min(0).optional().messages({
    "number.base": "display_order must be a number",
    "number.integer": "display_order must be an integer",
    "number.min": "display_order must be at least 0",
  }),
  icon_key: Joi.string().trim().max(64).optional().allow("").messages({
    "string.max": "icon_key must be at most 64 characters",
  }),
  credit_limit_minor: Joi.number().integer().min(0).optional().messages({
    "number.base": "Credit limit (minor units) must be a number",
    "number.integer": "Credit limit (minor units) must be an integer",
    "number.min": "Credit limit (minor units) must be at least 0",
  }),
  statement_day: Joi.number().integer().min(1).max(31).optional().allow(null).messages({
    "number.base": "statement_day must be a number",
    "number.integer": "statement_day must be an integer",
    "number.min": "statement_day must be at least 1",
    "number.max": "statement_day must be at most 31",
  }),
  payment_due_day: Joi.number().integer().min(1).max(31).optional().allow(null).messages({
    "number.base": "payment_due_day must be a number",
    "number.integer": "payment_due_day must be an integer",
    "number.min": "payment_due_day must be at least 1",
    "number.max": "payment_due_day must be at most 31",
  }),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  })
  .options({ convert: true });

/**
 * Used for routes that require ?id=<account_id> (single get, update, delete).
 */
const accountIdQuerySchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "Account ID must be a number",
    "number.integer": "Account ID must be an integer",
    "number.positive": "Account ID must be a positive number",
    "any.required": "Account ID is required",
  }),
}).options({ convert: true });

const validateFetchAccounts = (data) => {
  return fetchAccountsSchema.validate(data, { abortEarly: false });
};

const validateCreateAccount = (data) => {
  return createAccountSchema.validate(data, { abortEarly: false });
};

const validateUpdateAccount = (data) => {
  return updateAccountSchema.validate(data, { abortEarly: false });
};

const validateAccountIdQuery = (data) => {
  return accountIdQuerySchema.validate(data, { abortEarly: false });
};

export {
  validateFetchAccounts,
  validateCreateAccount,
  validateUpdateAccount,
  validateAccountIdQuery,
};
