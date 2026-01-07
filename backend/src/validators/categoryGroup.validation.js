import Joi from "joi";
import { capitalizeTitleCase } from "../utils/sanitize.js";
import { VALID_CATEGORY_TYPES } from "../constants/constants.js";

// Custom Joi extension for title case sanitization
const titleCase = Joi.string().custom((value, helpers) => {
  return capitalizeTitleCase(value.trim());
}, "title case sanitization");

// Validation schema for fetching category groups
const fetchCategoryGroupsSchema = Joi.object({
  type: Joi.string()
    .lowercase()
    .trim()
    .valid(...VALID_CATEGORY_TYPES)
    .optional()
    .messages({
      "any.only": `Type must be one of: ${VALID_CATEGORY_TYPES.join(", ")}`,
    }),
});

// Validation schema for creating a category group
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

// Validation schema for updating a category group (all fields optional)
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

// Validation functions
const validateCreateCategoryGroup = (data) => {
  return createCategoryGroupSchema.validate(data, { abortEarly: false });
};

const validateUpdateCategoryGroup = (data) => {
  return updateCategoryGroupSchema.validate(data, { abortEarly: false });
};

const validateFetchCategoryGroups = (data) => {
  return fetchCategoryGroupsSchema.validate(data, { abortEarly: false });
};

export { validateCreateCategoryGroup, validateUpdateCategoryGroup, validateFetchCategoryGroups };