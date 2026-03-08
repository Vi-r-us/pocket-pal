import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  putBudgetMonth,
  getBudgetMonth,
  getBudgetSummary,
} from "../controllers/budget.controller.js";

const router = Router();

router
  .route("/month/:yyyyMm")
  .put(verifyJWT, putBudgetMonth)
  .get(verifyJWT, getBudgetMonth);

router.get("/month/:yyyyMm/summary", verifyJWT, getBudgetSummary);

export default router;
