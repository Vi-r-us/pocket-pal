import { Sequelize } from "sequelize";

export const sequelize = new Sequelize(process.env.DATABASE, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT, // likely a string, needs parseInt sometimes
  dialect: "postgres",
  logging: false,
});
