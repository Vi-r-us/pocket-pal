import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
} from "../controllers/account.controller.js";

const router = Router();

router.route("/").get(verifyJWT, getAccounts).post(verifyJWT, createAccount);

router
  .route("/:id")
  .get(verifyJWT, getAccount)
  .patch(verifyJWT, updateAccount)
  .delete(verifyJWT, deleteAccount);

export default router;
