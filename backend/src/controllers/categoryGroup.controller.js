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
import { validateFetchCategoryGroups, validateCreateCategoryGroup, validateUpdateCategoryGroup } from "../validators/categoryGroup.validation.js";

const getCategoriesGroup = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;
  const categoryGroupId = req.query.id;

  if (categoryGroupId) {
    // If categoryGroupId is provided, fetch single category group
    const categoryGroup = await fetchCategoryGroupService(userId, categoryGroupId);
    return res.status(200).json(new ApiResponse(200, categoryGroup, "Category group fetched successfully"));
  }

  // Validate request body
  const { error, value } = validateFetchCategoryGroups(req.body);
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }


  // Fetch category groups from database or service
  const categoryGroups = await fetchCategoryGroupsService(userId, value.type);
  return res.status(200).json(new ApiResponse(200, categoryGroups, "Category groups fetched successfully"));
});

const createCategoriesGroup = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  // Validate request body
  const { error, value } = validateCreateCategoryGroup(req.body);
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  // Create new category group in database or service
  const newCategoryGroup = await createCategoryGroupService(userId, value);
  return res.status(201).json(new ApiResponse(201, newCategoryGroup, "Category group created successfully"));
});

const updateCategoriesGroup = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;
  const categoryGroupId = req.query.id;

  // Validate request body
  const { error, value } = validateUpdateCategoryGroup(req.body);
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  // Update category group in database or service
  const updatedCategoryGroup = await updateCategoryGroupService(userId, categoryGroupId, value);
  return res.status(200).json(new ApiResponse(200, updatedCategoryGroup, "Category group updated successfully"));
});

const deleteCategoriesGroup = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;
  const categoryGroupId = req.query.id;

  // Delete category group from database or service
  await deleteCategoryGroupService(userId, categoryGroupId);
  return res.status(200).json(new ApiResponse(200, null, "Category group deleted successfully"));
});

export { getCategoriesGroup, createCategoriesGroup, updateCategoriesGroup, deleteCategoriesGroup };
