import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  hideCategory,
  unhideCategory,
} from "../controllers/category.controller.js";

const router = Router();

router.route("/").get(verifyJWT, getCategories).post(verifyJWT, createCategory);

// :id/hide before :id so "hide" is not captured as id
router.route("/:id/hide").post(verifyJWT, hideCategory);
router.route("/:id/unhide").delete(verifyJWT, unhideCategory);

router
  .route("/:id")
  .get(verifyJWT, getCategory)
  .patch(verifyJWT, updateCategory)
  .delete(verifyJWT, deleteCategory);

export default router;
