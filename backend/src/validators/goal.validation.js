import Joi from "joi";
import { GOAL_STATUSES } from "../constants/constants.js";

/** Validate goal public_id (UUID). */
const goalIdParamSchema = Joi.string().guid({ version: "uuidv4" }).required().messages({
  "string.guid": "Goal id must be a valid UUID",
  "any.required": "Goal id is required",
});

/** Schema for POST create goal. Accepts category_id or categoryId. */
const createGoalSchema = Joi.object({
  categoryId: Joi.number().integer().positive().optional(),
  category_id: Joi.number().integer().positive().optional(),
  name: Joi.string().trim().min(1).max(80).required().messages({
    "string.empty": "Name is required",
    "any.required": "Name is required",
  }),
  target_amount_minor: Joi.number().integer().min(0).required().messages({
    "number.base": "target_amount_minor must be a number",
    "any.required": "target_amount_minor is required",
  }),
  target_currency: Joi.string().trim().uppercase().length(3).required().messages({
    "string.length": "Currency code must be 3 characters",
    "any.required": "target_currency is required",
  }),
  category_id: Joi.number().integer().positive().optional().messages({
    "number.base": "category_id must be a number",
  }),
  start_date: Joi.date().required().messages({
    "date.base": "start_date must be a valid date",
    "any.required": "start_date is required",
  }),
  end_date: Joi.date().optional().greater(Joi.ref("start_date")).messages({
    "date.greater": "end_date must be after start_date",
  }),
}).options({ convert: true });

/** Schema for PATCH update goal. */
const updateGoalSchema = Joi.object({
  name: Joi.string().trim().min(1).max(80).optional().messages({
    "string.empty": "Name cannot be empty",
  }),
  target_amount_minor: Joi.number().integer().min(0).optional().messages({
    "number.base": "target_amount_minor must be a number",
  }),
  target_currency: Joi.string().trim().uppercase().length(3).optional().messages({
    "string.length": "Currency code must be 3 characters",
  }),
  end_date: Joi.date().optional().allow(null).messages({
    "date.base": "end_date must be a valid date",
  }),
  status: Joi.string()
    .lowercase()
    .trim()
    .valid(...GOAL_STATUSES)
    .optional()
    .messages({
      "any.only": `status must be one of: ${GOAL_STATUSES.join(", ")}`,
    }),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  })
  .options({ convert: true });

const validateGoalIdParam = (data) => goalIdParamSchema.validate(data, { abortEarly: false });

const validateCreateGoal = (data) => createGoalSchema.validate(data, { abortEarly: false });

const validateUpdateGoal = (data) => updateGoalSchema.validate(data, { abortEarly: false });

export { validateGoalIdParam, validateCreateGoal, validateUpdateGoal };
