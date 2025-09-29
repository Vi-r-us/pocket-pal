import app from "./app.js";
import { DB_NAME } from "./constants/constants.js";
import connectDB from "./db/index.js";

const port = process.env.PORT || 8000;

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
