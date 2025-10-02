import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import userRoutes from "./routes/user.routes.js";

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

// Importing and using user routes
app.use("/api/v1/users", userRoutes);

export default app; 
