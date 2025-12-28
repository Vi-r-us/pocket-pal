import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { listCategories } from "../controllers/category.controller.js";

const router = Router();

// Category Routes
router.get("/", verifyJWT, listCategories);

export default router;
