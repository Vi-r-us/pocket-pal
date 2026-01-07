import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createCategoriesGroup,
  deleteCategoriesGroup,
  getCategoriesGroup,
  updateCategoriesGroup,
} from "../controllers/categoryGroup.controller.js";

const router = Router();

// Category Group Routes
router.get("/", verifyJWT, getCategoriesGroup);

router.post("/", verifyJWT, createCategoriesGroup);
router.patch("/", verifyJWT, updateCategoriesGroup);
router.delete("/", verifyJWT, deleteCategoriesGroup);

export default router;
