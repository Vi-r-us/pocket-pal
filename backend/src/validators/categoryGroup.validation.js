import Joi from "joi";
import { capitalizeTitleCase } from "../utils/sanitize.js";
import { VALID_CATEGORY_TYPES } from "../constants/constants.js";

/**
 * Joi custom type: normalizes string to title case (e.g. "my group" -> "My Group").
 * Used for category group names so they are stored consistently.
 */
const titleCase = Joi.string().custom((value, helpers) => {
  return capitalizeTitleCase(value.trim());
}, "title case sanitization");

/** Used for GET list: optional type filter (expense | income | savings). Applied to req.body. */
const fetchCategoryGroupsSchema = Joi.object({
  type: Joi.string()
    .lowercase()
    .trim()
    .optional()
    .valid(...VALID_CATEGORY_TYPES)
    .messages({
      "any.only": `Type must be one of: ${VALID_CATEGORY_TYPES.join(", ")}`,
    }),
});

/** Used for POST create: name and type required; name is normalized to title case. */
const createCategoryGroupSchema = Joi.object({
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
});

/** Used for PATCH update: at least one of name or type; both optional. No empty updates. */
const updateCategoryGroupSchema = Joi.object({
  name: titleCase.optional(),
  type: Joi.string()
    .lowercase()
    .trim()
    .valid(...VALID_CATEGORY_TYPES)
    .optional()
    .messages({
      "any.only": `Type must be one of: ${VALID_CATEGORY_TYPES.join(", ")}`,
    }),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

/**
 * Used for routes that require ?id=<group_id> (single get, update, delete).
 * Ensures id is a positive integer; convert: true coerces query string "123" to number.
 */
const categoryGroupIdQuerySchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "Category group ID must be a number",
    "number.integer": "Category group ID must be an integer",
    "number.positive": "Category group ID must be a positive number",
    "any.required": "Category group ID is required",
  }),
}).options({ convert: true });

const validateCreateCategoryGroup = (data) => {
  return createCategoryGroupSchema.validate(data, { abortEarly: false });
};

const validateUpdateCategoryGroup = (data) => {
  return updateCategoryGroupSchema.validate(data, { abortEarly: false });
};

const validateFetchCategoryGroups = (data) => {
  return fetchCategoryGroupsSchema.validate(data, { abortEarly: false });
};

const validateCategoryGroupIdQuery = (data) => {
  return categoryGroupIdQuerySchema.validate(data, { abortEarly: false });
};

export {
  validateCreateCategoryGroup,
  validateUpdateCategoryGroup,
  validateFetchCategoryGroups,
  validateCategoryGroupIdQuery,
};
