import { DataTypes, Model } from "sequelize";

class Currency extends Model {}

const defineCurrencyModel = (sequelize) => {
  Currency.init(
    {
      code: { type: DataTypes.STRING(3), allowNull: false, unique: true, primaryKey: true },
      name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      symbol: { type: DataTypes.STRING(10), allowNull: false },
      minor_unit: { type: DataTypes.SMALLINT, allowNull: false },
    },
    {
      sequelize,
      underscored: true,
      modelName: "Currency",
      tableName: "currencies",
      timestamps: false,
    }
  );
  return Currency;
};

export default defineCurrencyModel;
