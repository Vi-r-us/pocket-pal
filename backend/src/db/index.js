import dotenv from "dotenv";
import { sequelize } from "./sequelize.js";
// Ensure models are loaded so sequelize knows about them
import "../models/index.js";

dotenv.config();

// Connect to PostgreSQL using pg-pool
// const connectDB = async () => {
//   try { 
//     const client = await pool.connect();
//     client.release();
//     // res.status(200).json({ message: "Connected to the database" });

//     const databaseNameResult = await pool.query("SELECT current_database()");
//     const databaseName = databaseNameResult.rows[0].current_database;
//     console.log(`Connected to database: ${databaseName}`);
//   } catch (error) {
//     console.error("Error connecting to the database:", error);
//     process.exit(1);
//     // res.status(500).json({ error: "Failed to connect to the database" });
//   }
// };

// This code connects to a PostgreSQL database using Sequelize ORM.
const connectDB = async () => {
  try {
    await sequelize.authenticate();

    // Dev: sync schema from models. Production/staging on hosts: use migrations only (no alter).
    const nodeEnv = process.env.NODE_ENV || "development";
    if (nodeEnv !== "production") {
      await sequelize.sync({ alter: true });
    }

    const [result] = await sequelize.query("SELECT current_database()");

    console.log("Current DB:", result[0].current_database);
    console.log(
      "Connected to database:",
      process.env.DATABASE_URL ? "(DATABASE_URL)" : process.env.DATABASE
    );
  } catch (err) {
    console.error("Unable to connect to DB:", err);
    process.exit(1);
  }
};

export default connectDB;
