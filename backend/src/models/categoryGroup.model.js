import { DataTypes, Model } from "sequelize";

class CategoryGroup extends Model {}

/**
 * Define CategoryGroup model
 * @param {Sequelize} sequelize
 * @returns {CategoryGroup} CategoryGroup model
 * @description
 * This model represents category groups, which are used to group related categories together.
 * Category groups can be user-specific or system-wide.
 * @example
 * const models = require("../models");
 * const CategoryGroup = models.defineCategoryGroupModel(sequelize);
 */
const defineCategoryGroupModel = (sequelize) => {
  CategoryGroup.init(
    {
      group_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.INTEGER, allowNull: true },
      type: { type: DataTypes.ENUM("income", "expense", "savings"), allowNull: false },
      name: { type: DataTypes.STRING(80), allowNull: false },
    },
    {
      sequelize,
      underscored: true,
      modelName: "CategoryGroup",
      tableName: "category_groups",
      timestamps: false,
    }
  );

  CategoryGroup.associate = (models) => {
    CategoryGroup.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    CategoryGroup.hasMany(models.Category, { foreignKey: "group_id", as: "categories" });
  };

  return CategoryGroup;
};

export default defineCategoryGroupModel;
