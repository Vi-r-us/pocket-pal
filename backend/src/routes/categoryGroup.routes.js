import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getCategoryGroups,
  getCategoryGroup,
  createCategoryGroup,
  updateCategoryGroup,
  deleteCategoryGroup,
} from "../controllers/categoryGroup.controller.js";

const router = Router();

router.route("/").get(verifyJWT, getCategoryGroups).post(verifyJWT, createCategoryGroup);

router
  .route("/:id")
  .get(verifyJWT, getCategoryGroup)
  .patch(verifyJWT, updateCategoryGroup)
  .delete(verifyJWT, deleteCategoryGroup);

export default router;
