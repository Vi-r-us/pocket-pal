import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  fetchCategories as fetchCategoriesService,
  fetchCategory as fetchCategoryService,
  createCategory as createCategoryService,
  updateCategory as updateCategoryService,
  deleteCategory as deleteCategoryService,
  hideCategory as hideCategoryService,
  unhideCategory as unhideCategoryService,
} from "../services/category.service.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  validateFetchCategories,
  validateCreateCategory,
  validateUpdateCategory,
  validateCategoryIdQuery,
} from "../validators/category.validation.js";

/**
 * GET /categories
 * - With query.id: returns a single category (and its group) by id.
 * - Without id: returns all categories for the user, optionally filtered by query (type, groupId, includeHidden).
 */
const getCategories = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;
  const categoryId = req.query.id;

  if (categoryId !== undefined && categoryId !== "") {
    const queryValidation = validateCategoryIdQuery({ id: req.query.id });
    if (queryValidation.error) {
      const errorMessages = queryValidation.error.details.map((d) => d.message).join(", ");
      throw new ApiError(400, `Validation error: ${errorMessages}`);
    }
    const category = await fetchCategoryService(userId, queryValidation.value.id);
    return res.status(200).json(new ApiResponse(200, category, "Category fetched successfully"));
  }

  const { error, value } = validateFetchCategories(req.query);
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  const categories = await fetchCategoriesService(userId, value);
  return res.status(200).json(new ApiResponse(200, categories, "Categories fetched successfully"));
});

/**
 * POST /categories
 * Creates a new category. Body: { name, type, groupId? }.
 */
const createCategory = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const { error, value } = validateCreateCategory(req.body);
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  const newCategory = await createCategoryService(userId, value);
  return res.status(201).json(new ApiResponse(201, newCategory, "Category created successfully"));
});

/**
 * PATCH /categories?id=<category_id>
 * Updates a user-owned category. Body: { name?, type?, groupId?, is_active? } (at least one required).
 */
const updateCategory = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const queryValidation = validateCategoryIdQuery({ id: req.query.id });
  if (queryValidation.error) {
    const errorMessages = queryValidation.error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }
  const categoryId = queryValidation.value.id;

  const { error, value } = validateUpdateCategory(req.body);
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  const updatedCategory = await updateCategoryService(userId, categoryId, value);
  return res.status(200).json(new ApiResponse(200, updatedCategory, "Category updated successfully"));
});

/**
 * DELETE /categories?id=<category_id>
 * Deletes a category. Only owner can delete; not allowed if category is in use by transactions (use disable instead).
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const { error, value } = validateCategoryIdQuery({ id: req.query.id });
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  await deleteCategoryService(userId, value.id);
  return res.status(200).json(new ApiResponse(200, null, "Category deleted successfully"));
});

/**
 * POST /categories/hide?id=<category_id>
 * Hides a system category for the current user.
 */
const hideCategory = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const { error, value } = validateCategoryIdQuery({ id: req.query.id });
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  await hideCategoryService(userId, value.id);
  return res.status(200).json(new ApiResponse(200, null, "Category hidden successfully"));
});

/**
 * DELETE /categories/hide?id=<category_id>
 * Unhides a system category for the current user.
 */
const unhideCategory = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const { error, value } = validateCategoryIdQuery({ id: req.query.id });
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }

  await unhideCategoryService(userId, value.id);
  return res.status(200).json(new ApiResponse(200, null, "Category unhidden successfully"));
});

export {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  hideCategory,
  unhideCategory,
};
