import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  syncAllAccountBalances,
  syncAccountBalance,
} from "../controllers/account.controller.js";

const router = Router();

router.route("/").get(verifyJWT, getAccounts).post(verifyJWT, createAccount);

router.post("/sync-balances", verifyJWT, syncAllAccountBalances);

router
  .route("/:id")
  .get(verifyJWT, getAccount)
  .patch(verifyJWT, updateAccount)
  .delete(verifyJWT, deleteAccount);

router.post("/:id/sync-balance", verifyJWT, syncAccountBalance);

export default router;
