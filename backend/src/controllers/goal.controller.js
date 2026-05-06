import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  createGoal as createGoalService,
  listGoals as listGoalsService,
  getGoalDetail as getGoalDetailService,
  updateGoal as updateGoalService,
  deleteGoal as deleteGoalService,
} from "../services/goal.service.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  validateGoalIdParam,
  validateCreateGoal,
  validateUpdateGoal,
} from "../validators/goal.validation.js";

/**
 * POST /goals
 * Create goal. If categoryId not provided, creates a savings category for the goal.
 */
const createGoal = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  if (
    req.body == null ||
    typeof req.body !== "object" ||
    Array.isArray(req.body) ||
    Object.keys(req.body).length === 0
  ) {
    throw new ApiError(400, "Request body is required");
  }

  const { error, value } = validateCreateGoal(req.body);
  if (error) {
    const messages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${messages}`);
  }

  const goal = await createGoalService(userId, value);
  return res.status(201).json(new ApiResponse(201, goal, "Goal created successfully"));
});

/**
 * GET /goals
 * List goals with progress.
 */
const listGoals = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const goals = await listGoalsService(userId);
  return res.status(200).json(new ApiResponse(200, goals, "Goals fetched successfully"));
});

/**
 * GET /goals/:id
 * Goal detail + contributing transactions (id = public_id).
 */
const getGoal = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const paramValidation = validateGoalIdParam(req.params.id);
  if (paramValidation.error) {
    const messages = paramValidation.error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${messages}`);
  }
  const publicId = paramValidation.value;

  const goal = await getGoalDetailService(userId, publicId);
  return res.status(200).json(new ApiResponse(200, goal, "Goal fetched successfully"));
});

/**
 * PATCH /goals/:id
 * Update name, target_amount_minor, target_currency, end_date, status.
 */
const updateGoal = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const paramValidation = validateGoalIdParam(req.params.id);
  if (paramValidation.error) {
    const messages = paramValidation.error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${messages}`);
  }
  const publicId = paramValidation.value;

  if (
    req.body == null ||
    typeof req.body !== "object" ||
    Array.isArray(req.body) ||
    Object.keys(req.body).length === 0
  ) {
    throw new ApiError(400, "Request body is required");
  }

  const { error, value } = validateUpdateGoal(req.body);
  if (error) {
    const messages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${messages}`);
  }

  const goal = await updateGoalService(userId, publicId, value);
  return res.status(200).json(new ApiResponse(200, goal, "Goal updated successfully"));
});

/**
 * DELETE /goals/:id
 * Soft delete: set status=archived.
 */
const deleteGoal = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const paramValidation = validateGoalIdParam(req.params.id);
  if (paramValidation.error) {
    const messages = paramValidation.error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${messages}`);
  }
  const publicId = paramValidation.value;

  await deleteGoalService(userId, publicId);
  return res.status(200).json(new ApiResponse(200, null, "Goal archived successfully"));
});

export { createGoal, listGoals, getGoal, updateGoal, deleteGoal };
