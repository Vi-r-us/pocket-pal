import { Op } from "sequelize";
import handleServerError from "../utils/handleServerError.js";
import logger from "../utils/logger.js";
import ApiError from "../utils/ApiError.js";
import { Category, CategoryGroup, UserHiddenCategory } from "../models/index.js";

const fetchCategories = async (userId, type) => {
  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }

  // Logic to fetch categories from the database based on userId and type
  try {
    logger.info(`Fetching categories for user: ${userId} with type: ${type}`);

    const hiddenCategories = await UserHiddenCategory.findAll({
      where: { user_id: userId },
    });
    const hiddenCategoryIds = hiddenCategories.map((cat) => cat.categoryId);

    // Construct the where clause
    const whereClause = { is_active: true, [Op.or]: [{ user_id: null }, { user_id: userId }] };
    // Add type and hiddenCategoryIds to the where clause
    if (type) {
      whereClause.type = type;
    }
    if (hiddenCategoryIds.length > 0) {
      whereClause.id = { [Op.notIn]: hiddenCategoryIds };
    }

    // Simulated database fetch operation
    const categories = await Category.findAll({
      where: whereClause,
      include: [{ model: CategoryGroup, as: "group" }],
      order: [
        ["name", "ASC"],
        ["type", "ASC"],
      ],
    });

    if (!categories) {
      logger.warn(`No categories found for user: ${userId} with type: ${type}`);
      return [];
    }

    return categories;
  } catch (error) {
    handleServerError(error, "Error fetching categories", 500);
  }
};

export { fetchCategories };
