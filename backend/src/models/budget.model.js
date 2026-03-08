import { DataTypes, Model } from "sequelize";

class Budget extends Model {}

/**
 * Define Budget model
 * Per-category budget amount for a budget period.
 */
const defineBudgetModel = (sequelize) => {
  Budget.init(
    {
      budget_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      budget_period_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "budget_periods", key: "budget_period_id" },
      },
      category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "categories", key: "category_id" },
      },
      amount_minor: { type: DataTypes.BIGINT, allowNull: false },
    },
    {
      sequelize,
      underscored: true,
      modelName: "Budget",
      tableName: "budgets",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["budget_period_id"], name: "idx_budgets_budget_period_id" },
        { fields: ["category_id"], name: "idx_budgets_category_id" },
        { unique: true, fields: ["budget_period_id", "category_id"], name: "uq_budgets_period_category" },
      ],
    }
  );

  Budget.associate = (models) => {
    Budget.belongsTo(models.BudgetPeriod, { foreignKey: "budget_period_id", as: "budgetPeriod" });
    Budget.belongsTo(models.Category, { foreignKey: "category_id", as: "category" });
  };

  return Budget;
};

export default defineBudgetModel;
