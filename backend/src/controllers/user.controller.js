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
import logger from "../utils/logger.js";
import {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateUpdatePassword,
  validateUserIdParam,
} from "../validators/user.validation.js";

const isProduction = process.env.NODE_ENV === "production";
const useCrossSiteAuthCookies = process.env.AUTH_COOKIE_CROSS_SITE === "true" || isProduction;

const buildAuthCookieOptions = (withExpiry = false) => {
  const baseOptions = {
    httpOnly: true,
    secure: useCrossSiteAuthCookies,
    sameSite: useCrossSiteAuthCookies ? "None" : "Lax",
    path: "/",
  };

  if (!withExpiry) {
    return baseOptions;
  }

  return {
    ...baseOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
};

const registerUser = asyncHandler(async (req, res) => {
  const { error, value } = validateRegister(req.body);
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }
  const userData = {
    ...value,
    avatarFile: req.files?.avatar?.[0] || null,
    coverFile: req.files?.coverImage?.[0] || null,
  };

  const newUser = await registerUserService(userData);
  return res.status(201).json(new ApiResponse(201, newUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { error, value } = validateLogin(req.body);
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }
  const { email, username, password } = value;

  const loggedInUser = await loginUserService({ email, username, password });

  // Cookie options
  const options = buildAuthCookieOptions(true);

  // Set refresh token and access token in HTTP-only cookie
  return res
    .status(200)
    .cookie("accessToken", loggedInUser.accessToken, options)
    .cookie("refreshToken", loggedInUser.refreshToken, options)
    .json(new ApiResponse(200, { user: loggedInUser.user }, "User logged in successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
  // User ID from auth middleware
  const userId = req.user.user_id;
  // Logout user
  await logoutUserService(userId);

  // Clear cookies
  const clearOptions = buildAuthCookieOptions();

  return res
    .status(200)
    .clearCookie("accessToken", clearOptions)
    .clearCookie("refreshToken", clearOptions)
    .json(new ApiResponse(200, null, "User logged out successfully"));
});

const refreshTokens = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(400, "Refresh token is required");
  }

  const { accessToken, refreshToken } = await refreshTokensService(incomingRefreshToken);

  // Cookie options
  const options = buildAuthCookieOptions(true);

  // Set refresh token and access token in HTTP-only cookie
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, { refreshed: true }, "Access token refreshed successfully"));
});

// Resolve :id to current user id; only "me" is allowed (validated by validateUserIdParam).
const resolveProfileUserId = (req) => {
  const { error } = validateUserIdParam({ id: req.params.id });
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, errorMessages);
  }
  return req.user?.user_id;
};

const getProfile = asyncHandler(async (req, res) => {
  const userId = resolveProfileUserId(req);
  const profile = await getProfileService(userId);
  return res.status(200).json(new ApiResponse(200, profile, "User profile fetched successfully"));
});

const updateProfile = asyncHandler(async (req, res) => {
  const userId = resolveProfileUserId(req);
  const { error, value } = validateUpdateProfile(req.body);
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }
  const safeBody = { ...value };
  if (safeBody.password) safeBody.password = "[REDACTED]";
  logger.debug({ userId, body: safeBody }, "updateProfile request");

  const updated = await updateProfileService(userId, value);
  return res.status(200).json(new ApiResponse(200, updated, "Profile updated successfully"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const userId = resolveProfileUserId(req);
  const avatarFile = req.files?.avatar?.[0] || req.file || null;
  const updated = await updateAvatarService(userId, avatarFile);
  return res.status(200).json(new ApiResponse(200, updated, "Avatar updated successfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  const userId = resolveProfileUserId(req);
  const coverFile = req.files?.coverImage?.[0] || req.file || null;
  if (!coverFile) throw new ApiError(400, "Cover image file is required");
  const updated = await updateCoverImageService(userId, coverFile);
  return res.status(200).json(new ApiResponse(200, updated, "Cover image updated successfully"));
});

const updatePassword = asyncHandler(async (req, res) => {
  const userId = resolveProfileUserId(req);
  const { error, value } = validateUpdatePassword(req.body);
  if (error) {
    const errorMessages = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }
  const { currentPassword, newPassword } = value;
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
