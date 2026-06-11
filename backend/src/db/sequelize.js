import "dotenv/config";
import { Sequelize } from "sequelize";

/**
 * Prefer DATABASE_URL (Neon, Render, Railway, etc.). Fall back to discrete DB_* vars for local dev.
 */
function createSequelize() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const isLocal =
      url.includes("localhost") || url.includes("127.0.0.1") || url.includes("sslmode=disable");
    return new Sequelize(url, {
      dialect: "postgres",
      logging: false,
      dialectOptions: isLocal
        ? {}
        : {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          },
    });
  }

  return new Sequelize(process.env.DATABASE, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    logging: false,
  });
}

export const sequelize = createSequelize();
