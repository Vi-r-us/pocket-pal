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
