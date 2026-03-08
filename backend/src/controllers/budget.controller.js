import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  putBudgetMonth as putBudgetMonthService,
  getBudgetMonth as getBudgetMonthService,
  getBudgetSummary as getBudgetSummaryService,
} from "../services/budget.service.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { validateYyyyMmParam, validatePutBudget } from "../validators/budget.validation.js";

/**
 * PUT /budgets/month/:yyyyMm
 * Create/update category budgets for the month (idempotent).
 */
const putBudgetMonth = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const paramValidation = validateYyyyMmParam(req.params.yyyyMm);
  if (paramValidation.error) {
    const messages = paramValidation.error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${messages}`);
  }
  const yyyyMm = parseInt(paramValidation.value, 10);

  if (
    req.body == null ||
    typeof req.body !== "object" ||
    Array.isArray(req.body) ||
    Object.keys(req.body).length === 0
  ) {
    throw new ApiError(400, "Request body is required");
  }

  const bodyValidation = validatePutBudget(req.body);
  if (bodyValidation.error) {
    const messages = bodyValidation.error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${messages}`);
  }

  const result = await putBudgetMonthService(userId, yyyyMm, bodyValidation.value);
  return res.status(200).json(new ApiResponse(200, result, "Budgets updated successfully"));
});

/**
 * GET /budgets/month/:yyyyMm
 * List budgets for the month.
 */
const getBudgetMonth = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const paramValidation = validateYyyyMmParam(req.params.yyyyMm);
  if (paramValidation.error) {
    const messages = paramValidation.error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${messages}`);
  }
  const yyyyMm = parseInt(paramValidation.value, 10);

  const result = await getBudgetMonthService(userId, yyyyMm);
  return res.status(200).json(new ApiResponse(200, result, "Budgets fetched successfully"));
});

/**
 * GET /budgets/month/:yyyyMm/summary
 * Budget vs spent per category + totals.
 */
const getBudgetSummary = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const paramValidation = validateYyyyMmParam(req.params.yyyyMm);
  if (paramValidation.error) {
    const messages = paramValidation.error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${messages}`);
  }
  const yyyyMm = parseInt(paramValidation.value, 10);

  const result = await getBudgetSummaryService(userId, yyyyMm);
  return res.status(200).json(new ApiResponse(200, result, "Budget summary fetched successfully"));
});

export { putBudgetMonth, getBudgetMonth, getBudgetSummary };
