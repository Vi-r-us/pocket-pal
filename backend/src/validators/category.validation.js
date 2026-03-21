import Joi from "joi";
import { capitalizeTitleCase } from "../utils/sanitize.js";
import { VALID_CATEGORY_TYPES } from "../constants/constants.js";

/**
 * Joi custom type: normalizes string to title case (e.g. "my category" -> "My Category").
 */
const titleCase = Joi.string().custom((value, _helpers) => {
  return capitalizeTitleCase(value.trim());
}, "title case sanitization");

/** Used for GET list: optional type, groupId, includeHidden (query params). */
const fetchCategoriesSchema = Joi.object({
  type: Joi.string()
    .lowercase()
    .trim()
    .optional()
    .valid(...VALID_CATEGORY_TYPES)
    .messages({
      "any.only": `Type must be one of: ${VALID_CATEGORY_TYPES.join(", ")}`,
    }),
  groupId: Joi.number().integer().positive().optional().messages({
    "number.base": "Group ID must be a number",
    "number.integer": "Group ID must be an integer",
    "number.positive": "Group ID must be a positive number",
  }),
  includeHidden: Joi.boolean().optional().messages({
    "boolean.base": "includeHidden must be true or false",
  }),
  isSystem: Joi.boolean().optional().messages({
    "boolean.base": "isSystem must be true or false",
  }),
  isActive: Joi.boolean().optional().messages({
    "boolean.base": "isActive must be true or false",
  }),
}).options({ convert: true });

/** Used for POST create: name and type required; groupId optional. */
const createCategorySchema = Joi.object({
  name: titleCase.required().messages({
    "string.empty": "Name is required",
    "any.required": "Name is required",
  }),
  type: Joi.string()
    .lowercase()
    .trim()
    .valid(...VALID_CATEGORY_TYPES)
    .required()
    .messages({
      "any.only": `Type must be one of: ${VALID_CATEGORY_TYPES.join(", ")}`,
      "string.empty": "Type is required",
      "any.required": "Type is required",
    }),
  groupId: Joi.number().integer().positive().allow(null).optional().messages({
    "number.base": "Group ID must be a number",
    "number.integer": "Group ID must be an integer",
    "number.positive": "Group ID must be a positive number",
  }),
}).options({ convert: true });

/** Used for PATCH update: at least one of name, type, groupId, is_active. */
const updateCategorySchema = Joi.object({
  name: titleCase.optional(),
  type: Joi.string()
    .lowercase()
    .trim()
    .valid(...VALID_CATEGORY_TYPES)
    .optional()
    .messages({
      "any.only": `Type must be one of: ${VALID_CATEGORY_TYPES.join(", ")}`,
    }),
  groupId: Joi.number().integer().positive().allow(null).optional().messages({
    "number.base": "Group ID must be a number",
    "number.integer": "Group ID must be an integer",
    "number.positive": "Group ID must be a positive number",
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
 * Used for routes that require ?id=<category_id> (single get, update, delete, hide, unhide).
 */
const categoryIdQuerySchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "Category ID must be a number",
    "number.integer": "Category ID must be an integer",
    "number.positive": "Category ID must be a positive number",
    "any.required": "Category ID is required",
  }),
}).options({ convert: true });

const validateFetchCategories = (data) => {
  return fetchCategoriesSchema.validate(data, { abortEarly: false });
};

const validateCreateCategory = (data) => {
  return createCategorySchema.validate(data, { abortEarly: false });
};

const validateUpdateCategory = (data) => {
  return updateCategorySchema.validate(data, { abortEarly: false });
};

const validateCategoryIdQuery = (data) => {
  return categoryIdQuerySchema.validate(data, { abortEarly: false });
};

export {
  validateFetchCategories,
  validateCreateCategory,
  validateUpdateCategory,
  validateCategoryIdQuery,
};
