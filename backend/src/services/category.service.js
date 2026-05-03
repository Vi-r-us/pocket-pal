import { Op } from "sequelize";
import handleServerError from "../utils/handleServerError.js";
import logger from "../utils/logger.js";
import ApiError from "../utils/ApiError.js";
import { Category, CategoryGroup, UserHiddenCategory } from "../models/index.js";
import { capitalizeTitleCase } from "../utils/sanitize.js";
import { createLog } from "./log.service.js";

/**
 * Fetches categories for a user: system categories (user_id null) plus the user's own, active only.
 * Optionally filtered by type, groupId, isSystem, isActive. Excludes hidden categories unless includeHidden is true.
 * @param {number} userId
 * @param {Object} params - { type?, groupId?, includeHidden?, isSystem?, isActive? }
 */
const fetchCategories = async (userId, params = {}) => {
  const { type, groupId, includeHidden, isSystem, isActive } = params || {};
  logger.info({ userId, type, groupId, includeHidden, isSystem, isActive }, "fetchCategories called");

  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }

  try {
    let hiddenCategoryIds = [];
    if (!includeHidden) {
      const hiddenCategories = await UserHiddenCategory.findAll({
        where: { user_id: userId },
      });
      hiddenCategoryIds = hiddenCategories.map((cat) => cat.category_id);
    }

    const whereClause = { [Op.or]: [{ user_id: null }, { user_id: userId }] };
    if (isActive !== undefined && isActive !== null) {
      whereClause.is_active = isActive;
    }
    if (isSystem !== undefined && isSystem !== null) {
      whereClause.is_system = isSystem;
    }
    if (type) {
      whereClause.type = type;
    }
    if (groupId !== undefined && groupId !== null) {
      whereClause.group_id = groupId;
    }
    if (hiddenCategoryIds.length > 0) {
      whereClause.category_id = { [Op.notIn]: hiddenCategoryIds };
    }

    const categories = await Category.findAll({
      where: whereClause,
      include: [{ model: CategoryGroup, as: "group" }],
      order: [
        ["name", "ASC"],
        ["type", "ASC"],
      ],
    });

    if (!categories) {
      logger.warn({ userId, type }, "No categories found");
      return [];
    }

    logger.info({ userId, count: categories.length }, "Fetched categories");
    return categories;
  } catch (error) {
    throw handleServerError(error, "Error fetching categories", 500);
  }
};

/**
 * Fetches a single category by id (system or user's own). Does not filter by hidden.
 */
const fetchCategory = async (userId, categoryId) => {
  logger.info({ userId, categoryId }, "fetchCategory called");

  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }
  if (categoryId === undefined || categoryId === null || categoryId === "") {
    throw new ApiError(400, "Category ID is required");
  }

  try {
    const category = await Category.findOne({
      where: {
        category_id: categoryId,
        [Op.or]: [{ user_id: null }, { user_id: userId }],
      },
      include: [{ model: CategoryGroup, as: "group" }],
    });

    if (!category) {
      throw new ApiError(404, "Category not found");
    }

    return category;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw handleServerError(error, "Error fetching category", 500);
  }
};

const createCategory = async (userId, categoryData) => {
  logger.info({ userId, categoryData }, "createCategory called");

  try {
    if (!userId) {
      throw new ApiError(400, "User ID is required to create a category");
    }

    let { name, type, groupId, iconKey } = categoryData;
    if (!name || !type) {
      throw new ApiError(400, "Category name and type are required");
    }

    name = capitalizeTitleCase(name);
    type = type.toLowerCase();

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

    if (groupId) {
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

    const createPayload = {
      name,
      type,
      group_id: groupId || null,
      is_system: false,
      is_active: true,
      user_id: userId,
    };
    if (Object.prototype.hasOwnProperty.call(categoryData, "iconKey")) {
      createPayload.icon_key = iconKey;
    }

    const newCategory = await Category.create(createPayload);

    logger.info({ userId, categoryId: newCategory.category_id }, "Category created");
    return newCategory;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw handleServerError(error, "Error creating category", 500);
  }
};

const updateCategory = async (userId, categoryId, updateData) => {
  logger.info({ userId, categoryId, updateData }, "updateCategory called");

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

    if (updateData.name !== undefined) {
      category.name = capitalizeTitleCase(updateData.name);
    }
    if (updateData.type !== undefined) {
      category.type = updateData.type.toLowerCase();
    }
    if (updateData.is_active !== undefined) {
      category.is_active = Boolean(updateData.is_active);
    }
    if (updateData.groupId !== undefined) {
      if (updateData.groupId === null) {
        category.group_id = null;
      } else {
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
    if (updateData.iconKey !== undefined) {
      category.icon_key = updateData.iconKey;
    }

    const updatedCategory = await category.save();
    logger.info({ userId, categoryId }, "Category updated");
    return updatedCategory;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw handleServerError(error, "Error updating category", 500);
  }
};

/**
 * Deletes a user-owned category. Fails with 409 if category is in use by any transaction (suggest disable instead).
 */
const deleteCategory = async (userId, categoryId) => {
  logger.info({ userId, categoryId }, "deleteCategory called");

  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }
  if (categoryId === undefined || categoryId === null || categoryId === "") {
    throw new ApiError(400, "Category ID is required");
  }

  try {
    const category = await Category.findByPk(categoryId);
    if (!category) {
      throw new ApiError(404, "Category not found");
    }
    if (category.user_id !== userId) {
      throw new ApiError(403, "You do not have permission to delete this category");
    }
    if (category.is_system) {
      throw new ApiError(403, "System categories cannot be deleted");
    }

    // TODO: Add transaction usage check
    // const usageCount = await Transaction.count({
    //   where: { category_id: categoryId },
    // });
    // if (usageCount > 0) {
    //   throw new ApiError(
    //     409,
    //     "Category is in use by transactions. Disable it instead by setting is_active to false."
    //   );
    // }

    await category.destroy();
    logger.info({ userId, categoryId }, "Category deleted");

    await createLog({
      user_id: userId,
      log_type: "audit",
      action: "delete",
      entity: "category",
      entity_id: categoryId,
      message: "Category deleted",
      details: { source: "category.service.deleteCategory" },
      old_value: category.get({ plain: true }),
      new_value: null,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw handleServerError(error, "Error deleting category", 500);
  }
};

/**
 * Hides a system category for the current user. Only system categories can be hidden.
 */
const hideCategory = async (userId, categoryId) => {
  logger.info({ userId, categoryId }, "hideCategory called");

  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }
  if (categoryId === undefined || categoryId === null || categoryId === "") {
    throw new ApiError(400, "Category ID is required");
  }

  try {
    const category = await Category.findByPk(categoryId);
    if (!category) {
      throw new ApiError(404, "Category not found");
    }
    if (category.user_id !== null) {
      throw new ApiError(403, "Only system categories can be hidden");
    }

    const [record] = await UserHiddenCategory.findOrCreate({
      where: { user_id: userId, category_id: categoryId },
      defaults: { user_id: userId, category_id: categoryId },
    });
    logger.info({ userId, categoryId }, "Category hidden");
    return record;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw handleServerError(error, "Error hiding category", 500);
  }
};

/**
 * Unhides a category for the current user. Idempotent.
 */
const unhideCategory = async (userId, categoryId) => {
  logger.info({ userId, categoryId }, "unhideCategory called");

  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }
  if (categoryId === undefined || categoryId === null || categoryId === "") {
    throw new ApiError(400, "Category ID is required");
  }

  try {
    await UserHiddenCategory.destroy({
      where: { user_id: userId, category_id: categoryId },
    });
    logger.info({ userId, categoryId }, "Category unhidden");
  } catch (error) {
    throw handleServerError(error, "Error unhiding category", 500);
  }
};

export {
  fetchCategories,
  fetchCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  hideCategory,
  unhideCategory,
};
