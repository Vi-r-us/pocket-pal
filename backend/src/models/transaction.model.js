import { DataTypes, Model } from "sequelize";

class Transaction extends Model {}

const defineTransactionModel = (sequelize) => {
  Transaction.init(
    {
      transaction_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "user_id" } },
      account_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "accounts", key: "account_id" } },
      fx_rate_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "fx_rates", key: "fx_rate_id" } },
      category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "categories", key: "category_id" },
      },

      amount_minor: { type: DataTypes.BIGINT, allowNull: false },
      currency: { type: DataTypes.STRING(3), allowNull: false, references: { model: "currencies", key: "code" } },

      base_currency: { type: DataTypes.STRING(3), allowNull: false, references: { model: "currencies", key: "code" } },
      amount_base_minor: { type: DataTypes.BIGINT, allowNull: false },

      type: { type: DataTypes.STRING(20), allowNull: false, validate: { isIn: [["deposit", "withdrawal", "savings"]] } }, // deposit, withdrawal, savings

      source: {
        type: DataTypes.ENUM("manual", "recurring", "transfer", "external"),
        allowNull: false,
        defaultValue: "manual",
      }, // manual, recurring, transfer, external
      description: { type: DataTypes.TEXT, allowNull: true, defaultValue: "" },
      metadata: { type: DataTypes.JSONB, allowNull: true },

      timestamp: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: "Transaction",
      tableName: "transactions",
      underscored: true,
      paranoid: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
    }
  );

  Transaction.associate = (models) => {
    Transaction.belongsTo(models.Account, { foreignKey: "account_id", as: "account" });
    Transaction.belongsTo(models.FXRate, { foreignKey: "fx_rate_id", as: "fxRate" });
    Transaction.belongsTo(models.Category, { foreignKey: "category_id", as: "category" });
  };

  return Transaction;
};

export default defineTransactionModel;
