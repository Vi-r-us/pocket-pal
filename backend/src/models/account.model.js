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
      opening_balance_minor: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
      credit_limit_minor: { type: DataTypes.BIGINT, allowNull: true },
      statement_day: { type: DataTypes.SMALLINT, allowNull: true },
      payment_due_day: { type: DataTypes.SMALLINT, allowNull: true },

      institution_name: { type: DataTypes.STRING(120), allowNull: true },
      account_number_last4: { type: DataTypes.STRING(4), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      icon_key: { type: DataTypes.STRING(64), allowNull: true },
      display_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      include_in_net_worth: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

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
        { fields: ["user_id", "display_order"], name: "idx_accounts_user_display_order" },
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
