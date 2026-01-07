import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import userRoutes from "./routes/user.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import categoryGroupRoutes from "./routes/categoryGroup.routes.js";
import ApiResponse from "./utils/ApiResponse.js";
import logger from "./utils/logger.js";
import requestLogger from "./middlewares/requestLogger.js";

const app = express();

// CORS setup
// This middleware enables CORS with a specific origin and allows credentials
// to be included in cross-origin requests
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:8000",
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
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/category-groups", categoryGroupRoutes);

// Global error handler (all failures)
// This middleware handles errors that occur in the application
app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const errors = err.errors || null;

  // Log errors with structured logger
  try {
    logger.error({ err, reqId: req.id, method: req.method, path: req.path, user: req.user?.public_id || req.user?.user_id || null }, "Error occurred");
  } catch (logErr) {
    // fall back to console if logger fails
    // eslint-disable-next-line no-console
    console.error("Error logging failed:", logErr);
  }

  res.status(status).json(new ApiResponse(status, null, message));
});

export default app;
