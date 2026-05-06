import { DataTypes, Model } from "sequelize";

class FXRate extends Model {}

const defineFXRateModel = (sequelize) => {
  FXRate.init(
    {
      fx_rate_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      base_currency: { type: DataTypes.STRING(3), allowNull: false },
      target_currency: { type: DataTypes.STRING(3), allowNull: false },
      as_of_date: { type: DataTypes.DATEONLY, allowNull: false },
      rate: { type: DataTypes.DECIMAL(10, 6), allowNull: false },
      source: { type: DataTypes.STRING(100), allowNull: true, defaultValue: "frankfurter" },
    },
    {
      sequelize,
      underscored: true,
      modelName: "FXRate",
      tableName: "fx_rates",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [{ unique: true, fields: ["base_currency", "target_currency", "as_of_date"] }],
    }
  );
  return FXRate;
};
export default defineFXRateModel;
