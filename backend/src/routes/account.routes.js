import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from "../controllers/account.controller.js";

const router = Router();

router
  .route("/")
  .get(verifyJWT, getAccounts)
  .post(verifyJWT, createAccount)
  .patch(verifyJWT, updateAccount)
  .delete(verifyJWT, deleteAccount);

export default router;
