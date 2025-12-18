import { DataTypes, Model } from "sequelize";

class Log extends Model {}

const defineLogModel = (sequelize) => {
  Log.init(
    {
      // Use universal unique identifier for external reference
      log_id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      user_id: {
        type: DataTypes.INTEGER,
        references: { model: "users", key: "user_id" },
        allowNull: true,
      },
      log_type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: { isIn: [["audit", "change", "error", "system"]] },
      }, // audit, change, error
      action: DataTypes.STRING(50),
      entity: DataTypes.STRING(50),
      entity_id: DataTypes.STRING(50),
      field_name: DataTypes.STRING(50),
      old_value: DataTypes.JSONB,
      new_value: DataTypes.JSONB,
      message: DataTypes.TEXT,
      stack: DataTypes.TEXT,
      details: DataTypes.JSONB,
      timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: "Log",
      tableName: "logs",
      timestamps: false,
      indexes: [
        { fields: ["user_id"] },
        { fields: ["log_type"] },
        { fields: ["action"] },
        { fields: ["entity"] },
        { fields: ["entity_id"] },
        { fields: ["field_name"] },
      ],
    }
  );

  return Log;
};

export default defineLogModel;
