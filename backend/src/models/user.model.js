import { DataTypes, Model } from "sequelize";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
const JWT_ACCESS_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRY || "15m";
const JWT_REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;
const JWT_REFRESH_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRY || "7d";

class User extends Model {
  // Instance method for comparing passwords
  async isPasswordCorrect(plainPassword) {
    return bcrypt.compare(plainPassword, this.password);
  }

  // Instance method to generate access JWT
  generateAccessToken() {
    return jwt.sign({ id: this.user_id, email: this.email, username: this.username }, JWT_ACCESS_SECRET, {
      expiresIn: JWT_ACCESS_EXPIRES_IN,
    });
  }

  // Instance method to generate refresh JWT
  generateRefreshToken() {
    return jwt.sign({ id: this.user_id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
  }
}

const defineUserModel = (sequelize) => {
  User.init(
    {
      // Use universal unique identifier for internal reference
      user_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      // Use universal unique identifier for external reference
      public_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
        allowNull: false,
      },
      username: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true,
        set(value) {
          if (value === undefined || value === null) {
            this.setDataValue("username", null);
            return;
          }
          const normalizedValue = String(value).trim().toLowerCase();
          this.setDataValue("username", normalizedValue || null);
        },
        validate: {
          notEmpty: true,
          len: [3, 50],
          is: /^[a-z0-9_]+$/, // enforce only letters/numbers/underscore
        },
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        set(value) {
          this.setDataValue("email", value.trim().toLowerCase());
        },
        validate: {
          isEmail: true,
          notEmpty: true,
        },
      },
      fullname: {
        type: DataTypes.STRING(150),
        allowNull: false,
        set(value) {
          this.setDataValue("fullname", value.trim());
        },
        validate: {
          notEmpty: true,
          len: [2, 150],
        },
      },
      avatar: {
        type: DataTypes.STRING(255),
        allowNull: true, // Not required
        validate: {
          isUrl: true,
        },
      },
      coverImage: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
          isUrl: true,
        },
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [8, 255], // recommend min length
        },
      },
      refreshToken: DataTypes.STRING(255),
      base_currency: {
        type: DataTypes.STRING(3),
        allowNull: true,
        references: { model: "currencies", key: "code" },
      },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users",
      timestamps: true,
      indexes: [
        { fields: ["username"], unique: true },
        { fields: ["email"], unique: true },
        { fields: ["public_id"], unique: true },
      ],
      scopes: {
        withSecrets: { attributes: { include: ["password", "refreshToken"] } }, // to include when needed
      },
      defaultScope: {
        attributes: { exclude: ["password", "refreshToken"] }, // hides by default
      },
    }
  );

  // Hook to hash password before saving
  User.addHook("beforeCreate", async (user) => {
    if (user.password) {
      user.password = await bcrypt.hash(user.password, 10);
    }
  });

  User.addHook("beforeUpdate", async (user) => {
    // Hash only if password changed
    if (user.changed("password")) {
      user.password = await bcrypt.hash(user.password, 10);
    }
  });

  return User;
};

export default defineUserModel;
