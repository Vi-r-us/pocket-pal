import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { commitImportedData, parseImport } from "../controllers/import.controller.js";

const router = Router();

router.route("/parse").post(verifyJWT, upload.single("file"), parseImport);
router.route("/commit").post(verifyJWT, upload.none(), commitImportedData);

export default router;
