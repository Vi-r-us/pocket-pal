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

// Profile Management Routes (path param :id must be "me" for current user)
router.get("/:id", verifyJWT, getProfile);
router.patch("/:id", verifyJWT, upload.none(), updateProfile);
router.patch("/:id/avatar", verifyJWT, upload.fields([{ name: "avatar", maxCount: 1 }]), updateAvatar);
router.patch("/:id/cover", verifyJWT, upload.fields([{ name: "coverImage", maxCount: 1 }]), updateCoverImage);
router.patch("/:id/password", verifyJWT, updatePassword);

export default router;
