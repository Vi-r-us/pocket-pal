import app from "./app.js";
import { DB_NAME } from "./constants/constants.js";
import connectDB from "./db/index.js";

const port = process.env.PORT || 8000;
const requiredEnvVars = ["ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET"];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(", ")}`);
}

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log(`Successfully connected to database: ${DB_NAME}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to the database:", error);
  });
