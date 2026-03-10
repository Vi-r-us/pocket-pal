import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  fetchCategoryGroups as fetchCategoryGroupsService,
  fetchCategoryGroup as fetchCategoryGroupService,
  createCategoryGroup as createCategoryGroupService,
  updateCategoryGroup as updateCategoryGroupService,
  deleteCategoryGroup as deleteCategoryGroupService,
} from "../services/categoryGroup.service.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  validateFetchCategoryGroups,
  validateCreateCategoryGroup,
  validateUpdateCategoryGroup,
  validateCategoryGroupIdQuery,
} from "../validators/categoryGroup.validation.js";

/**
 * GET /category-groups
 * Returns all category groups for the user. Optional query filter: type (expense|income|savings).
 */
const getCategoryGroups = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const { error, value } = validateFetchCategoryGroups(req.query);
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  const categoryGroups = await fetchCategoryGroupsService(userId, value.type);
  return res.status(200).json(new ApiResponse(200, categoryGroups, "Category groups fetched successfully"));
});

/**
 * GET /category-groups/:id
 * Returns a single category group (and its categories) by id.
 */
const getCategoryGroup = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const { error, value } = validateCategoryGroupIdQuery({ id: req.params.id });
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  const categoryGroup = await fetchCategoryGroupService(userId, value.id);
  return res.status(200).json(new ApiResponse(200, categoryGroup, "Category group fetched successfully"));
});

/**
 * POST /category-groups
 * Creates a new category group. Body: { name, type } (type: expense|income|savings).
 */
const createCategoryGroup = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const { error, value } = validateCreateCategoryGroup(req.body);
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  const newCategoryGroup = await createCategoryGroupService(userId, value);
  return res.status(201).json(new ApiResponse(201, newCategoryGroup, "Category group created successfully"));
});

/**
 * PATCH /category-groups/:id
 * Updates a user-owned category group. Body: { name?, type? } (at least one required). System groups cannot be updated.
 */
const updateCategoryGroup = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const paramValidation = validateCategoryGroupIdQuery({ id: req.params.id });
  if (paramValidation.error) {
    const errorMessages = paramValidation.error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }
  const categoryGroupId = paramValidation.value.id;

  const { error, value } = validateUpdateCategoryGroup(req.body);
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  const updatedCategoryGroup = await updateCategoryGroupService(userId, categoryGroupId, value);
  return res.status(200).json(new ApiResponse(200, updatedCategoryGroup, "Category group updated successfully"));
});

/**
 * DELETE /category-groups/:id
 * Deletes a category group. Only the owner (user_id) can delete; system groups (user_id null) cannot be deleted.
 */
const deleteCategoryGroup = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const { error, value } = validateCategoryGroupIdQuery({ id: req.params.id });
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  await deleteCategoryGroupService(userId, value.id);
  return res.status(200).json(new ApiResponse(200, null, "Category group deleted successfully"));
});

export { getCategoryGroups, getCategoryGroup, createCategoryGroup, updateCategoryGroup, deleteCategoryGroup };
