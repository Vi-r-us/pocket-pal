import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

function createPool() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const isLocal =
      url.includes("localhost") || url.includes("127.0.0.1") || url.includes("sslmode=disable");
    return new Pool({
      connectionString: url,
      ...(isLocal
        ? {}
        : {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          }),
    });
  }

  return new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });
}

const pool = createPool();

export default pool;
