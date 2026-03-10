import handleServerError from "../utils/handleServerError.js";
import logger from "../utils/logger.js";
import ApiError from "../utils/ApiError.js";
import { Category, CategoryGroup } from "../models/index.js";
import { Op } from "sequelize";
import { createLog } from "./log.service.js";
import getState from "../utils/logUtils.js";

/**
 * Fetches category groups from the database based on userId and type.
 *
 * @param {number|string} userId - Primary key (numeric or UUID) of the user to fetch.
 * @param {string} type - Type of category groups to fetch (e.g., 'expense', 'income', 'savings').
 * @returns {Promise<Array<CategoryGroup>>} - Array of category group objects.
 * @throws {ApiError} - 400 if userId is missing, 404 if no category groups found, 500 for DB errors.
 */
const fetchCategoryGroups = async (userId, type) => {
  logger.info(`fetchCategoryGroups called with userId: ${userId}, type: ${type}`);

  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }

  try {
    // Include both system groups (user_id null) and this user's own groups
    const whereClause = { [Op.or]: [{ user_id: null }, { user_id: userId }] };
    if (type !== undefined && type !== null && type !== "") {
      whereClause.type = type;
    }
    const categoryGroups = await CategoryGroup.findAll({
      where: whereClause,
      order: [
        ["name", "ASC"],
        ["type", "ASC"],
      ],
    });

    if (!categoryGroups) {
      logger.warn(`No category groups found for user: ${userId} with type: ${type}`);
      return [];
    }

    logger.info(`Fetched ${categoryGroups.length} category groups for user: ${userId} with type: ${type}\n`);

    return categoryGroups;
  } catch (error) {
    throw handleServerError(error);
  }
};

/**
 * Fetches a category group and its categories from the database based on userId and categoryGroupId.
 *
 * @param {number|string} userId - Primary key (numeric or UUID) of the user to fetch.
 * @param {string} categoryGroupId - ID of the category group to fetch.
 * @returns {Promise<CategoryGroup>} - Category group object.
 * @throws {ApiError} - 400 if userId or categoryGroupId is missing, 404 if category group not found, 500 for DB errors.
 */
const fetchCategoryGroup = async (userId, categoryGroupId) => {
  logger.info(`fetchCategoryGroup called with userId: ${userId}, categoryGroupId: ${categoryGroupId}`);

  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }

  if (categoryGroupId === undefined || categoryGroupId === null || categoryGroupId === "") {
    throw new ApiError(400, "Category group ID is required");
  }

  try {
    // Same access rule as list: system group or user's own group; include only categories user can see
    const categoryGroup = await CategoryGroup.findOne({
      where: {
        group_id: categoryGroupId,
        [Op.or]: [{ user_id: null }, { user_id: userId }],
      },
      include: [
        {
          model: Category,
          as: "categories",
          attributes: ["category_id", "name", "group_id"],
          where: { [Op.or]: [{ user_id: null }, { user_id: userId }] },
          required: false, // LEFT JOIN so group is returned even when it has no matching categories
        },
      ],
    });

    if (!categoryGroup) {
      throw new ApiError(404, "Category group not found");
    }

    logger.info(`Fetched category group with ID: ${categoryGroupId} for user: ${userId}\n`);

    return categoryGroup;
  } catch (error) {
    throw handleServerError(error);
  }
};

/**
 * Creates a new category group in the database based on the provided userId and categoryGroupData.
 *
 * @param {number|string} userId - Primary key (numeric or UUID) of the user to create the category group for.
 * @param {Object} categoryGroupData - Object containing the name and type of the category group to create.
 * @returns {Promise<CategoryGroup>} - Newly created category group object.
 * @throws {ApiError} - 400 if userId is missing, 409 if category group with the same name and type already exists, 500 for DB errors.
 */
const createCategoryGroup = async (userId, categoryGroupData) => {
  logger.info(`createCategoryGroup called with userId: ${userId}, categoryGroupData:`, categoryGroupData);

  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }

  try {
    // Duplicate check: same name + type per user (system groups are separate)
    const existingCategoryGroup = await CategoryGroup.findOne({
      where: {
        name: categoryGroupData.name,
        type: categoryGroupData.type,
        user_id: userId,
      },
    });

    if (existingCategoryGroup) {
      throw new ApiError(409, "Category group with the same name and type already exists");
    }

    const newCategoryGroup = await CategoryGroup.create({
      ...categoryGroupData,
      user_id: userId,
    });

    logger.info(`Created new category group with ID: ${newCategoryGroup.group_id}\n`);

    await createLog({
      user_id: userId,
      log_type: "audit",
      action: "create",
      entity: "category_group",
      entity_id: newCategoryGroup.group_id,
      message: `Category group "${categoryGroupData.name}" created`,
      details: {
        source: "categoryGroup.service.createCategoryGroup",
      },
      old_value: null,
      new_value: newCategoryGroup,
    });

    return newCategoryGroup;
  } catch (error) {
    throw handleServerError(error);
  }
};

/**
 * Updates a category group in the database based on the provided userId, categoryGroupId, and updateData.
 *
 * @param {number|string} userId - Primary key (numeric or UUID) of the user to update the category group for.
 * @param {number|string} categoryGroupId - Primary key (numeric or UUID) of the category group to update.
 * @param {Object} updateData - Object containing the fields to update on the category group.
 * @returns {Promise<CategoryGroup>} - Updated category group object.
 * @throws {ApiError} - 400 if userId or categoryGroupId is missing, 404 if category group not found, 500 for DB errors.
 */
const updateCategoryGroup = async (userId, categoryGroupId, updateData) => {
  logger.info(
    {
      userId,
      categoryGroupId,
      updateData,
    },
    `updateCategoryGroup called with userId: ${userId}, categoryGroupId: ${categoryGroupId}, updateData: ${JSON.stringify(updateData)}`
  );

  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }

  if (categoryGroupId === undefined || categoryGroupId === null || categoryGroupId === "") {
    throw new ApiError(400, "Category group ID is required");
  }

  try {
    // Find group if it's either system (user_id null) or owned by this user
    const existingCategoryGroup = await CategoryGroup.findOne({
      where: {
        group_id: categoryGroupId,
        [Op.or]: [{ user_id: null }, { user_id: userId }],
      },
    });

    if (!existingCategoryGroup) {
      throw new ApiError(404, "Category group not found");
    }

    // Only user-owned groups are editable; system groups are read-only
    if (existingCategoryGroup.user_id === null) {
      throw new ApiError(403, "System category groups cannot be modified");
    }

    const previousState = getState(existingCategoryGroup, updateData);

    const updatedCategoryGroup = await existingCategoryGroup.update(updateData);

    const newState = getState(updatedCategoryGroup, updateData);

    logger.info(`Updated category group with ID: ${updatedCategoryGroup.group_id}\n`);

    await createLog({
      user_id: userId,
      log_type: "audit",
      action: "update",
      entity: "category_group",
      entity_id: categoryGroupId,
      message: `Category group updated`,
      details: {
        source: "categoryGroup.service.updateCategoryGroup",
      },
      old_value: previousState,
      new_value: newState,
      field_name: Object.keys(updateData).join(", "),
    });

    return updatedCategoryGroup;
  } catch (error) {
    throw handleServerError(error);
  }
};

/**
 * Deletes a category group from the database based on userId and categoryGroupId.
 *
 * @param {number|string} userId - Primary key (numeric or UUID) of the user to delete the category group for.
 * @param {string} categoryGroupId - Primary key (numeric or UUID) of the category group to delete.
 * @returns {Promise<void>} - No response on success, throws ApiError on failure.
 * @throws {ApiError} - 400 if userId or categoryGroupId is missing, 404 if category group not found, 403 if user does not have permission, 500 for DB errors.
 */
const deleteCategoryGroup = async (userId, categoryGroupId) => {
  logger.info(`deleteCategoryGroup called with userId: ${userId}, categoryGroupId: ${categoryGroupId}`);

  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }

  if (categoryGroupId === undefined || categoryGroupId === null || categoryGroupId === "") {
    throw new ApiError(400, "Category group ID is required");
  }

  try {
    const existingCategoryGroup = await CategoryGroup.findOne({
      where: { group_id: categoryGroupId },
    });

    if (!existingCategoryGroup) {
      throw new ApiError(404, "Category group not found");
    }

    // Only the owner can delete; system groups (user_id null) are not deletable
    if (existingCategoryGroup.user_id !== userId) {
      throw new ApiError(403, "You do not have permission to delete this category group");
    }

    await existingCategoryGroup.destroy();

    logger.info(`Deleted category group with ID: ${categoryGroupId}\n`);

    await createLog({
      user_id: userId,
      log_type: "audit",
      action: "delete",
      entity: "category_group",
      entity_id: categoryGroupId,
      message: `Category group deleted`,
      details: {
        source: "categoryGroup.service.deleteCategoryGroup",
      },
      old_value: existingCategoryGroup,
      new_value: null,
    });
  } catch (error) {
    throw handleServerError(error);
  }
};

export { fetchCategoryGroups, fetchCategoryGroup, createCategoryGroup, updateCategoryGroup, deleteCategoryGroup };
