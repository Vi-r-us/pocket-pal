import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "../controllers/transaction.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router
  .route("/")
  .get(verifyJWT, getTransactions)
  .post(verifyJWT, upload.none(), createTransaction)
  .patch(verifyJWT, upload.none(), updateTransaction)
  .delete(verifyJWT, deleteTransaction);

export default router;
