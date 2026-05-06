import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createGoal,
  listGoals,
  getGoal,
  updateGoal,
  deleteGoal,
} from "../controllers/goal.controller.js";

const router = Router();

router.route("/").post(verifyJWT, createGoal).get(verifyJWT, listGoals);

router
  .route("/:id")
  .get(verifyJWT, getGoal)
  .patch(verifyJWT, updateGoal)
  .delete(verifyJWT, deleteGoal);

export default router;
