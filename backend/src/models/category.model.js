import { DataTypes, Model } from "sequelize";

class Category extends Model {}

/**
 * Define Category model
 * @param {Sequelize} sequelize
 * @returns {Category} Category model
 * @description
 * This model represents categories, which can be global, user-specific, or group-specific.
 * Categories can be disabled by users, and system categories are immutable.
 * @example
 * const models = require("../models");
 * const Category = models.defineCategoryModel(sequelize);
 */
const defineCategoryModel = (sequelize) => {
  Category.init(
    {
      category_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      // Categories can be global (no user_id or group_id), user-specific, or group-specific
      user_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: "users", key: "user_id" } },
      group_id: { type: DataTypes.INTEGER, allowNull: true },

      name: { type: DataTypes.STRING(80), allowNull: false },
      type: { type: DataTypes.ENUM("income", "expense", "savings"), allowNull: false }, // income, expense, savings

      // User can disable their own categories (soft disable)
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      // System categories cannot be disabled or modified by users
      is_system: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      sequelize,
      underscored: true,
      modelName: "Category",
      tableName: "categories",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        // helps prevent duplicates in user-owned categories; for system categories
        // user_id is null, so this also prevents duplicates among system categories
        { unique: true, fields: ["user_id", "type", "name"], name: "uq_categories_user_type_name" },
        { fields: ["group_id"], name: "idx_categories_group_id" },
      ],
    }
  );

  Category.associate = (models) => {
    // Category belongs to a user only if it's custom.
    // For system categories, user_id is null.
    Category.belongsTo(models.User, { foreignKey: "user_id", as: "user" });

    // Category belongs to a group only if it's group-specific.
    Category.belongsTo(models.CategoryGroup, { foreignKey: "group_id", as: "group" });

    // One category can be used by many transactions
    // Category.hasMany(models.Transaction, { foreignKey: "category_id", as: "transactions" });
    // One category can be hidden by many users
    Category.hasMany(models.UserHiddenCategory, { foreignKey: "category_id", as: "userHiddenCategories" });
  };

  return Category;
};

export default defineCategoryModel;