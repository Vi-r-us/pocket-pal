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
 * - With query.id: returns a single category group (and its categories) by id.
 * - Without id: returns all category groups for the user, optionally filtered by body.type (expense|income|savings).
 */
const getCategoriesGroup = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;
  const categoryGroupId = req.query.id;

  if (categoryGroupId !== undefined && categoryGroupId !== "") {
    const { error, value } = validateCategoryGroupIdQuery({ id: req.query.id });
    if (error) {
      const errorMessages = error.details.map((d) => d.message).join(", ");
      throw new ApiError(400, `Validation error: ${errorMessages}`);
    }
    const categoryGroup = await fetchCategoryGroupService(userId, value.id);
    return res.status(200).json(new ApiResponse(200, categoryGroup, "Category group fetched successfully"));
  }

  // Validate body parameters (type is optional filter for GET)
  const { error, value } = validateFetchCategoryGroups(req.body);
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  const categoryGroups = await fetchCategoryGroupsService(userId, value.type);
  return res.status(200).json(new ApiResponse(200, categoryGroups, "Category groups fetched successfully"));
});

/**
 * POST /category-groups
 * Creates a new category group. Body: { name, type } (type: expense|income|savings).
 */
const createCategoriesGroup = asyncHandler(async (req, res) => {
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
 * PATCH /category-groups?id=<group_id>
 * Updates a user-owned category group. Body: { name?, type? } (at least one required). System groups cannot be updated.
 */
const updateCategoriesGroup = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const queryValidation = validateCategoryGroupIdQuery({ id: req.query.id });
  if (queryValidation.error) {
    const errorMessages = queryValidation.error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }
  const categoryGroupId = queryValidation.value.id;

  const { error, value } = validateUpdateCategoryGroup(req.body);
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  const updatedCategoryGroup = await updateCategoryGroupService(userId, categoryGroupId, value);
  return res.status(200).json(new ApiResponse(200, updatedCategoryGroup, "Category group updated successfully"));
});

/**
 * DELETE /category-groups?id=<group_id>
 * Deletes a category group. Only the owner (user_id) can delete; system groups (user_id null) cannot be deleted.
 */
const deleteCategoriesGroup = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const { error, value } = validateCategoryGroupIdQuery({ id: req.query.id });
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  await deleteCategoryGroupService(userId, value.id);
  return res.status(200).json(new ApiResponse(200, null, "Category group deleted successfully"));
});

export { getCategoriesGroup, createCategoriesGroup, updateCategoriesGroup, deleteCategoriesGroup };
