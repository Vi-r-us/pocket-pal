import { DataTypes, Model } from "sequelize";

class Goal extends Model {}

/**
 * Define Goal model
 * Savings goal with target amount. Linked to a category for progress tracking.
 */
const defineGoalModel = (sequelize) => {
  Goal.init(
    {
      goal_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      public_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
        allowNull: false,
      },
      user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "user_id" } },
      name: { type: DataTypes.STRING(80), allowNull: false },
      target_amount_minor: { type: DataTypes.BIGINT, allowNull: false },
      target_currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        references: { model: "currencies", key: "code" },
      },
      category_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "categories", key: "category_id" },
      },
      start_date: { type: DataTypes.DATEONLY, allowNull: false },
      end_date: { type: DataTypes.DATEONLY, allowNull: true },
      status: {
        type: DataTypes.ENUM("active", "archived"),
        allowNull: false,
        defaultValue: "active",
      },
    },
    {
      sequelize,
      underscored: true,
      modelName: "Goal",
      tableName: "goals",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["user_id"], name: "idx_goals_user_id" },
        { fields: ["public_id"], name: "idx_goals_public_id" },
        { fields: ["status"], name: "idx_goals_status" },
      ],
    }
  );

  Goal.associate = (models) => {
    Goal.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    Goal.belongsTo(models.Category, { foreignKey: "category_id", as: "category" });
    Goal.belongsTo(models.Currency, { foreignKey: "target_currency", as: "currency" });
  };

  return Goal;
};

export default defineGoalModel;
