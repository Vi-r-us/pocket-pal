import { Op } from "sequelize";
import handleServerError from "../utils/handleServerError.js";
import logger from "../utils/logger.js";
import ApiError from "../utils/ApiError.js";
import { Category, CategoryGroup, UserHiddenCategory } from "../models/index.js";
import { capitalizeTitleCase } from "../utils/sanitize.js";

const fetchCategories = async (userId, type) => {
  logger.info(`fetchCategories called with userId: ${userId}, type: ${type}`);

  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }

  // Logic to fetch categories from the database based on userId and type
  try {
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

    logger.info(`Fetched ${categories.length} categories for user: ${userId} with type: ${type}`);

    return categories;
  } catch (error) {
    handleServerError(error, "Error fetching categories", 500);
  }
};

const createCategory = async (userId, categoryData) => {
  logger.info(`createCategory called with userId: ${userId}, and categoryData: ${JSON.stringify(categoryData)}`);

  try {
    if (!userId) {
      throw new ApiError(400, "User ID is required to create a category");
    }

    let { name, type, groupId } = categoryData;
    if (!name || !type) {
      throw new ApiError(400, "Category name and type are required");
    }

    name = capitalizeTitleCase(name);
    type = type.toLowerCase();

    // Check for duplicate category
    const existingCategory = await Category.findOne({
      where: {
        name,
        type,
        user_id: userId,
      },
    });
    if (existingCategory) {
      throw new ApiError(400, "Category with the same name and type already exists");
    }

    // Check if group exists
    if (groupId) {
      // must be system group or user’s own group, and same type
      const group = await CategoryGroup.findOne({
        where: {
          group_id: groupId,
          [Op.or]: [{ user_id: null }, { user_id: userId }],
          type,
        },
      });
      if (!group) {
        throw new ApiError(400, "Group does not exist");
      }
    }

    // Logic to create a new category in the database
    const newCategory = await Category.create({
      name,
      type,
      group_id: groupId || null,
      isSystem: false,
      is_active: true,
      user_id: userId,
    });

    logger.info(`Category created successfully for user: ${userId}`);

    return newCategory;
  } catch (error) {
    handleServerError(error, "Error creating category", 500);
  }
};

const updateCategory = async (userId, categoryId, updateData) => {
  logger.info(`updateCategory called with userId: ${userId}, categoryId: ${categoryId}, and updateData: ${JSON.stringify(updateData)}`);

  try {
    if (!userId) {
      throw new ApiError(400, "User ID is required to update a category");
    }

    if (!categoryId) {
      throw new ApiError(400, "Category ID is required to update a category");
    }

    const category = await Category.findByPk(categoryId);
    if (!category) {
      throw new ApiError(404, "Category not found");
    }

    if (category.is_system) {
      throw new ApiError(403, "System categories cannot be modified");
    }

    if (category.user_id !== userId) {
      throw new ApiError(403, "You do not have permission to update this category");
    }

    // If name is being updated, sanitize it
    if (updateData.name) {
      updateData.name = capitalizeTitleCase(updateData.name);
      category.name = updateData.name;
    }

    // If type is being updated, ensure it's valid
    if (updateData.type) {
      updateData.type = updateData.type.toLowerCase();
      category.type = updateData.type;
    }

    // If groupId is being updated, validate it
    if (updateData.groupId !== undefined) {
      if (updateData.groupId === null) {
        // Allow removing the category from a group
        category.group_id = null;
      } else {
        // must be system group or user’s own group, and same type
        const group = await CategoryGroup.findOne({
          where: {
            group_id: updateData.groupId,
            [Op.or]: [{ user_id: null }, { user_id: userId }],
            type: category.type,
          },
        });
        if (!group) {
          throw new ApiError(400, "Group does not exist");
        }
        category.group_id = updateData.groupId;
      }
    }

    const updatedCategory = await category.save();
    logger.info(`Category updated successfully for user: ${userId}`);
    return updatedCategory;
  } catch (error) { 
    handleServerError(error, "Error updating category", 500);
  }
};



export { fetchCategories, createCategory, updateCategory };
