import Joi from "joi";

/** Validate yyyyMm as 6-digit YYYYMM (e.g. 202602). */
const yyyyMmParamSchema = Joi.string()
  .pattern(/^(20\d{2})(0[1-9]|1[0-2])$/)
  .required()
  .messages({
    "string.pattern.base": "yyyyMm must be a valid 6-digit YYYYMM (e.g. 202602)",
    "any.required": "yyyyMm is required",
  });

/** Schema for PUT body: categoryBudgets array. */
const putBudgetSchema = Joi.object({
  categoryBudgets: Joi.array()
    .items(
      Joi.object({
        category_id: Joi.number().integer().positive().required().messages({
          "number.base": "category_id must be a number",
          "any.required": "category_id is required",
        }),
        amount_minor: Joi.number().integer().min(0).required().messages({
          "number.base": "amount_minor must be a number",
          "any.required": "amount_minor is required",
        }),
      })
    )
    .min(1)
    .required()
    .messages({
      "array.min": "At least one category budget is required",
      "any.required": "categoryBudgets is required",
    }),
}).options({ convert: true });

const validateYyyyMmParam = (data) => yyyyMmParamSchema.validate(data, { abortEarly: false });

const validatePutBudget = (data) => putBudgetSchema.validate(data, { abortEarly: false });

export { validateYyyyMmParam, validatePutBudget };
