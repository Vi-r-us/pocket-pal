import { DataTypes, Model } from "sequelize";

class Account extends Model {}

/**
 * Define Account model
 * @param {Sequelize} sequelize
 * @returns {Account} Account model
 * @description
 * Represents a place where money is held (e.g. bank account, cash). Transactions belong to an account;
 * balance_minor is debited/credited when transactions are created.
 */
const defineAccountModel = (sequelize) => {
  Account.init(
    {
      account_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "user_id" } },

      name: { type: DataTypes.STRING(80), allowNull: false },
      type: { type: DataTypes.STRING(20), allowNull: false }, // e.g. bank, cash, savings, credit_card

      currency_code: {
        type: DataTypes.STRING(3),
        allowNull: false,
        references: { model: "currencies", key: "code" },
      },
      balance_minor: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },

      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      underscored: true,
      modelName: "Account",
      tableName: "accounts",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["user_id"], name: "idx_accounts_user_id" },
        { unique: true, fields: ["user_id", "name"], name: "uq_accounts_user_name" },
      ],
    }
  );

  Account.associate = (models) => {
    Account.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    Account.belongsTo(models.Currency, { foreignKey: "currency_code", as: "currency" });
    Account.hasMany(models.Transaction, { foreignKey: "account_id", as: "transactions" });
  };

  return Account;
};

export default defineAccountModel;
