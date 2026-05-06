import { DataTypes, Model } from "sequelize";

class UserHiddenCategory extends Model {}

/**
 * Define UserHiddenCategory model
 * @param {Sequelize} sequelize
 * @returns {UserHiddenCategory} UserHiddenCategory model
 * @description
 * This model represents the many-to-many relationship between users and categories.
 * It tracks which categories each user has chosen to hide.
 * @example
 * const models = require("../models");
 * const UserHiddenCategory = models.defineUserHiddenCategoryModel(sequelize);
 */
const defineUserHiddenCategoryModel = (sequelize) => {
  UserHiddenCategory.init(
    {
      user_id: { type: DataTypes.INTEGER, primaryKey: true, references: { model: "users", key: "user_id" } },
      category_id: { type: DataTypes.INTEGER, primaryKey: true, references: { model: "categories", key: "category_id" } },
    },
    {
      sequelize,
      underscored: true,
      modelName: "UserHiddenCategory",
      tableName: "user_hidden_categories",
      timestamps: false,
    }
  );

  UserHiddenCategory.associate = (models) => {
    UserHiddenCategory.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    UserHiddenCategory.belongsTo(models.Category, { foreignKey: "category_id", as: "category" });
  };

  return UserHiddenCategory;
};

export default defineUserHiddenCategoryModel;