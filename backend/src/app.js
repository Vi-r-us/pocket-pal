import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import accountRoutes from "./routes/account.routes.js";
import userRoutes from "./routes/user.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import categoryGroupRoutes from "./routes/categoryGroup.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import budgetRoutes from "./routes/budget.routes.js";
import goalRoutes from "./routes/goal.routes.js";
import healthRoutes from "./routes/health.routes.js";
import importRoutes from "./routes/import.routes.js";
import ApiResponse from "./utils/ApiResponse.js";
import logger from "./utils/logger.js";
import requestLogger from "./middlewares/requestLogger.js";

const app = express();

// CORS setup
// This middleware enables CORS with a specific origin and allows credentials
// to be included in cross-origin requests
const normalizeOrigin = (origin = "") =>
  origin
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/+$/, "")
    .toLowerCase();

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);

const allowedOriginsSet = new Set(allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (no Origin header) and explicitly whitelisted origins
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = normalizeOrigin(origin);
      const isLocalhostDevOrigin =
        normalizedOrigin.startsWith("http://localhost:") ||
        normalizedOrigin.startsWith("http://127.0.0.1:");

      if (allowedOriginsSet.has(normalizedOrigin) || isLocalhostDevOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

// Body parser setup
// This middleware parses incoming request bodies in a middleware before your handlers,
// available under the `req.body` property. It supports JSON and URL-encoded data.
app.use(
  express.json({
    limit: "50mb",
  })
);

// This middleware parses URL-encoded data with a limit of 50mb
// It is used to handle form submissions and other URL-encoded data
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// This middleware serves static files from the 'public' directory
app.use(express.static("public"));

// Cookie parser setup
// This middleware parses cookies attached to the client request object
app.use(cookieParser());

// Request logger (attach req.id and log basic request info)
app.use(requestLogger);

// Importing and using routes
app.use("/api/v1/accounts", accountRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/category-groups", categoryGroupRoutes);
app.use("/api/v1/transactions", transactionRoutes);
app.use("/api/v1/budgets", budgetRoutes);
app.use("/api/v1/goals", goalRoutes);
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/import", importRoutes);

// Global error handler (all failures)
// This middleware handles errors that occur in the application
app.use((err, req, res, _next) => {
  const status = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const _errors = err.errors || null;

  // Log errors with structured logger
  try {
    logger.error({ err, reqId: req.id, method: req.method, path: req.path, user: req.user?.public_id || req.user?.user_id || null }, "Error occurred");
    process.stdout.write("\n");
  } catch (logErr) {
    // fall back to console if logger fails
    console.error("Error logging failed:", logErr);
  }

  res.status(status).json(new ApiResponse(status, null, message));
});

export default app;
