import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  fetchCategories as fetchCategoriesService,
  createCategory as createCategoryService,
  updateCategory as updateCategoryService,
} from "../services/category.service.js";
import ApiResponse from "../utils/ApiResponse.js";

const getCategories = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;
  const type = req.body?.type; // e.g., 'expense', 'income' or 'savings'
  // Fetch categories from database or service
  const categories = await fetchCategoriesService(userId, type);
  return res.status(200).json(new ApiResponse(200, categories, "Categories fetched successfully"));
});

const createCategory = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;
  const categoryData = req.body;
  // Create new category in database or service
  const newCategory = await createCategoryService(userId, categoryData);
  return res.status(201).json(new ApiResponse(201, newCategory, "Category created successfully"));
});

const updateCategory = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;
  const categoryId = req.query.id;
  const updateData = req.body;
  // Update category in database or service
  const updatedCategory = await updateCategoryService(userId, categoryId, updateData);
  return res.status(200).json(new ApiResponse(200, updatedCategory, "Category updated successfully"));
});

export { getCategories, createCategory, updateCategory };
