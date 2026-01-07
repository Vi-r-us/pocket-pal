import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createCategory, getCategories, updateCategory } from "../controllers/category.controller.js";

const router = Router();

// Category Routes
router.get("/", verifyJWT, getCategories);
router.post("/", verifyJWT, createCategory);

router.patch("/", verifyJWT, updateCategory);

export default router;
