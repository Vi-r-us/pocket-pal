import { Router } from "express";
import { healthCheckDB } from "../db/healthCheck.js";
import ApiResponse from "../utils/ApiResponse.js";

const router = Router();

/**
 * GET /api/v1/health
 * Health check for deployment platforms (e.g. Render). Returns 200 if DB is reachable, 503 otherwise.
 */
router.get("/", async (req, res) => {
  const ok = await healthCheckDB();
  const status = ok ? 200 : 503;
  res.status(status).json(
    new ApiResponse(status, { status: ok ? "ok" : "unhealthy", database: ok }, ok ? "OK" : "Database unavailable")
  );
});

export default router;
