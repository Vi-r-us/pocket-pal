import { DataTypes, Model } from "sequelize";

class BudgetPeriod extends Model {}

/**
 * Define BudgetPeriod model
 * Represents a monthly budget period per user. Currency is user's base_currency at creation.
 */
const defineBudgetPeriodModel = (sequelize) => {
  BudgetPeriod.init(
    {
      budget_period_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "user_id" } },
      yyyy_mm: { type: DataTypes.INTEGER, allowNull: false }, // e.g. 202602
      currency_code: {
        type: DataTypes.STRING(3),
        allowNull: false,
        references: { model: "currencies", key: "code" },
      },
    },
    {
      sequelize,
      underscored: true,
      modelName: "BudgetPeriod",
      tableName: "budget_periods",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["user_id"], name: "idx_budget_periods_user_id" },
        { unique: true, fields: ["user_id", "yyyy_mm"], name: "uq_budget_periods_user_yyyy_mm" },
      ],
    }
  );

  BudgetPeriod.associate = (models) => {
    BudgetPeriod.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    BudgetPeriod.belongsTo(models.Currency, { foreignKey: "currency_code", as: "currency" });
    BudgetPeriod.hasMany(models.Budget, { foreignKey: "budget_period_id", as: "budgets" });
  };

  return BudgetPeriod;
};

export default defineBudgetPeriodModel;
