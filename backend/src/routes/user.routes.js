import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshTokens,
  getProfile,
  updateProfile,
  updateAvatar,
  updatePassword,
  updateCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Auth and Account Access Routes
router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-tokens").post(refreshTokens);

// TODO: Password Reset Routes
// router.post("/forgot-password", forgotPassword);
// router.post("/reset-password", resetPassword);

// Profile Management Routes
router.get("/me", verifyJWT, getProfile);
router.patch("/me", verifyJWT, updateProfile);
router.patch("/me/avatar", verifyJWT, updateAvatar);
router.patch("/me/cover", verifyJWT, updateCoverImage);
router.patch("/me/password", verifyJWT, updatePassword);

export default router;
