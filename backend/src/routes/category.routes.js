import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  hideCategory,
  unhideCategory,
} from "../controllers/category.controller.js";

const router = Router();

// Hide/unhide must be before "/" so /hide is matched
router.route("/hide").post(verifyJWT, hideCategory).delete(verifyJWT, unhideCategory);

router
  .route("/")
  .get(verifyJWT, getCategories)
  .post(verifyJWT, createCategory)
  .patch(verifyJWT, updateCategory)
  .delete(verifyJWT, deleteCategory);

export default router;
