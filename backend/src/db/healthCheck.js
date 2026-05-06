import pool from "./pool.js";

export async function healthCheckDB() {
  try {
    const client = await pool.connect();
    client.release();
    return true;
  } catch {
    return false;
  }
}
