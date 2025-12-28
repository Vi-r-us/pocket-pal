import { asyncHandler } from "../middlewares/asyncHandler.js";
import { fetchCategories as fetchCategoriesService } from "../services/category.service.js";
import ApiResponse from "../utils/ApiResponse.js";

const listCategories = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;
  const type = req.query.type; // e.g., 'expense', 'income' or 'savings'
  // Fetch categories from database or service
  const categories = await fetchCategoriesService(userId, type);
  return res.status(200).json(new ApiResponse(200, categories, "Categories fetched successfully"));
});

export { listCategories };