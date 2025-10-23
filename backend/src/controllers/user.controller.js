import {
  registerUser as registerUserService,
  loginUser as loginUserService,
  logoutUser as logoutUserService,
  refreshTokens as refreshTokensService,
  getProfile as getProfileService,
  updateProfile as updateProfileService,
  updateAvatar as updateAvatarService,
  updatePassword as updatePasswordService,
  updateCoverImage as updateCoverImageService,
} from "../services/user.service.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";

const registerUser = asyncHandler(async (req, res) => {
  const userData = {
    ...req.body,
    avatarFile: req.files?.avatar?.[0] || null,
    coverFile: req.files?.coverImage?.[0] || null,
  };

  const newUser = await registerUserService(userData);
  return res.status(201).json(new ApiResponse(201, newUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  const { email, username, password } = req.body;

  // Get logged in user data with tokens
  const loggedInUser = await loginUserService({ email, username, password });

  // Cookie options
  const options = {
    httpOnly: true,
    // secure: process.env.NODE_ENV === "production",
    secure: true,
    sameSite: "Strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  // Set refresh token and access token in HTTP-only cookie
  return res
    .status(200)
    .cookie("accessToken", loggedInUser.accessToken, options)
    .cookie("refreshToken", loggedInUser.refreshToken, options)
    .json(new ApiResponse(200, loggedInUser, "User logged in successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
  // User ID from auth middleware
  const userId = req.user.user_id;
  // Logout user
  await logoutUserService(userId);

  // Clear cookies
  const option = {
    httpOnly: true,
    // secure: process.env.NODE_ENV === "production",
    secure: true,
    sameSite: "Strict",
  };

  return res
    .status(200)
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json(new ApiResponse(200, null, "User logged out successfully"));
});

const refreshTokens = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(400, "Refresh token is required");
  }

  const { accessToken, refreshToken } = await refreshTokensService(incomingRefreshToken);

  // Cookie options
  const options = {
    httpOnly: true,
    // secure: process.env.NODE_ENV === "production",
    secure: true,
    sameSite: "Strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  // Set refresh token and access token in HTTP-only cookie
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, accessToken, "Access token refreshed successfully"));
});

// Profile controllers
const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user?.user_id;
  const profile = await getProfileService(userId);
  return res.status(200).json(new ApiResponse(200, profile, "User profile fetched successfully"));
});

const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user?.user_id;
  const updated = await updateProfileService(userId, req.body);
  return res.status(200).json(new ApiResponse(200, updated, "Profile updated successfully"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const userId = req.user?.user_id;
  const avatarFile = req.files?.avatar?.[0] || req.file || null;
  if (!avatarFile) throw new ApiError(400, "Avatar file is required");
  const updated = await updateAvatarService(userId, avatarFile);
  return res.status(200).json(new ApiResponse(200, updated, "Avatar updated successfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  const userId = req.user?.user_id;
  const coverFile = req.files?.coverImage?.[0] || req.file || null;
  if (!coverFile) throw new ApiError(400, "Cover image file is required");
  const updated = await updateCoverImageService(userId, coverFile);
  return res.status(200).json(new ApiResponse(200, updated, "Cover image updated successfully"));
});

const updatePassword = asyncHandler(async (req, res) => {
  const userId = req.user?.user_id;
  const { currentPassword, newPassword } = req.body;
  await updatePasswordService(userId, currentPassword, newPassword);
  return res.status(200).json(new ApiResponse(200, null, "Password updated successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshTokens,
  getProfile,
  updateProfile,
  updateAvatar,
  updateCoverImage,
  updatePassword,
};
