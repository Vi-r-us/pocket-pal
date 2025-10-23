import { Op } from "sequelize";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { uploadImageOnCloudinary } from "../utils/cloudinary.js";
import { createLog } from "./log.service.js";

/**
 * Generates an access token and a refresh token for the given user ID.
 * The generated tokens are saved in the database and returned as an object.
 * If the token generation fails, an ApiError is thrown with a status code of 500.
 *
 * @param {number} userId - The ID of the user to generate tokens for.
 * @returns {Promise<Object>} - An object containing the generated access token and refresh token.
 * @throws {ApiError} - If the token generation fails.
 */
const generateAccessAndRefreshToken = async (userId) => {
  try {
    // Generate tokens
    const user = await User.findByPk(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Save refresh token in DB
    user.refreshToken = refreshToken;
    await user.save({ validate: false });

    // Return tokens
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Failed to generate tokens");
  }
};

/**
 * Registers a new user with the provided username, email, fullname, password, avatar file and cover file.
 * The function validates the required fields, checks for existing users, checks password strength and
 * checks the size of the avatar and cover files if provided. If any of the checks fail, an ApiError is thrown.
 * The function then handles the avatar and cover files if provided, prepares the user data, creates a new
 * user in the database and returns the new user data without sensitive fields.
 *
 * @param {{ username: string, email: string, fullname: string, password: string, avatarFile: Express.Multer.File, coverFile: Express.Multer.File }}}
 * @returns {Promise<Object>}
 * @throws {ApiError}
 */
const registerUser = async ({ username, email, fullname, password, avatarFile, coverFile }) => {
  // Validate required fields
  if ([username, email, fullname, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "Missing required fields");
  }

  // Check for existing user
  const existingUser = await User.findOne({
    where: {
      [Op.or]: [{ username }, { email }],
    },
  });
  if (existingUser) {
    throw new ApiError(409, "Username or email already exists");
  }

  // Check password strength
  if (password.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters long");
  }

  // Check avatar and cover file size
  if (avatarFile && avatarFile.size > 5 * 1024 * 1024) {
    throw new ApiError(400, "Avatar file size must be less than 5MB");
  }
  if (coverFile && coverFile.size > 5 * 1024 * 1024) {
    throw new ApiError(400, "Cover image file size must be less than 5MB");
  }

  // Handle avatar and cover file if provided
  let avatarUrl = null;
  if (avatarFile) {
    avatarUrl = await uploadImageOnCloudinary(avatarFile.path, "pocketpal/avatars", username);
  }

  let coverImageUrl = null;
  if (coverFile) {
    coverImageUrl = await uploadImageOnCloudinary(coverFile.path, "pocketpal/covers", username);
  }

  // Prepare user data
  const userData = {
    username: username.trim(),
    email: email.trim().toLowerCase(),
    fullname: fullname.trim(),
    password: password.trim(),
    avatar: avatarUrl?.secure_url || null,
    coverImage: coverImageUrl?.secure_url || null,
  };

  // Create user in DB
  const newUser = await User.create(userData);

  // Prepare response by removing sensitive fields
  const userObj = { ...newUser.get() };
  delete userObj.user_id;
  delete userObj.password;
  delete userObj.refreshToken;

  return userObj;
};

/**
 * Logs in a user with the provided email or username and password.
 * The function validates the required fields, finds the user by username or email,
 * checks the password, generates an access token and a refresh token, and returns the user data
 * without sensitive fields and the generated tokens.
 * If any of the checks fail, an ApiError is thrown with the appropriate status code and error message.
 *
 * @param {{ email: string, username: string, password: string }} - An object containing the email or username and password.
 * @returns {Promise<Object>} - An object containing the user data without sensitive fields and the generated access token and refresh token.
 * @throws {ApiError} - If the checks fail.
 */
const loginUser = async ({ email, username, password }) => {
  // Validate required fields (email or username and password)
  if ((!username && !email) || !password) {
    throw new ApiError(400, "Username or email and password are required");
  }

  // Find user by username or email
  const user = await User.scope("withSecrets").findOne({
    where: {
      [Op.or]: [{ username: username || null }, { email: email || null }],
    },
  });

  // if user not found, throw error
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check password
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

  // Generate access token and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user.user_id);

  // Fetch fresh user data
  const loggedInUser = await User.findByPk(user.user_id);

  // Prepare response by removing sensitive user data (without password and refresh token) and tokens
  const userObj = { ...loggedInUser.get() };
  delete userObj.user_id;
  delete userObj.password;
  delete userObj.refreshToken;

  // Return user data and tokens
  return { user: userObj, accessToken, refreshToken };
};

/**
 * Logs out the user with the given user ID by setting the refresh token to null.
 *
 * @param {number} userId - The ID of the user to log out.
 * @returns {Promise<void>} - A promise that resolves when the user is logged out successfully.
 * @throws {ApiError} - If the user is not found or the logout process fails.
 */
const logoutUser = async (userId) => {
  // Find user by ID
  const user = await User.findByPk(userId);

  // set refresh token to null
  user.refreshToken = null;
  await user.save({ validate: false });
};

/**
 * Refreshes the access token and refresh token for a user given a valid refresh token.
 * The function verifies the refresh token using the secret key, finds the user by ID from the decoded token,
 * checks that the user exists and that the refresh token matches the one stored in the database.
 * If the checks pass, the function generates a new access token and refresh token, and returns them.
 * If any of the checks fail, an ApiError is thrown with a 401 status code and an appropriate error message.
 *
 * @param {string} incomingRefreshToken - The refresh token to be verified and used to refresh the access token and refresh token.
 * @returns {Promise<Object>} - A promise that resolves with an object containing the new access token and refresh token.
 * @throws {ApiError} - If the refresh token is invalid or if the user is not found.
 */
const refreshTokens = async (incomingRefreshToken) => {
  try {
    // Verify the refresh token using the secret key
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Find user by ID from the decoded token
    const user = await User.scope("withSecrets").findByPk(decodedToken?.id);

    if (!user || user.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Invalid refresh token");
    }

    // Generate access token and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user.user_id);

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(401, error.message || "Invalid refresh token", error);
  }
};

/**
 * Get profile for a user (without sensitive fields)
 */
const getProfile = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) throw new ApiError(404, "User not found");
  const userObj = { ...user.get() };
  delete userObj.password;
  delete userObj.refreshToken;
  delete userObj.user_id;
  return userObj;
};

/**
 * Update profile fields (username, email, fullname)
 */
const updateProfile = async (userId, data = {}) => {
  const user = await User.findByPk(userId);
  if (!user) throw new ApiError(404, "User not found");

  const allowed = ["username", "email", "fullname"];
  allowed.forEach((key) => {
    if (data[key] !== undefined) user[key] = data[key];
  });

  await user.save();
  const userObj = { ...user.get() };
  delete userObj.password;
  delete userObj.refreshToken;
  delete userObj.user_id;
  await createLog({
    user_id: user.user_id,
    log_type: "change",
    action: "update_profile",
    entity: "user",
    entity_id: user.public_id,
  });
  return userObj;
};

/**
 * Update avatar image
 */
const updateAvatar = async (userId, avatarFile) => {
  const user = await User.findByPk(userId);
  if (!user) throw new ApiError(404, "User not found");
  if (!avatarFile) throw new ApiError(400, "Avatar file is required");

  const avatarUrl = await uploadImageOnCloudinary(avatarFile.path, "pocketpal/avatars", user.username);
  user.avatar = avatarUrl?.secure_url || user.avatar;
  await user.save({ validate: false });

  const userObj = { ...user.get() };
  delete userObj.password;
  delete userObj.refreshToken;
  delete userObj.user_id;
  await createLog({
    user_id: user.user_id,
    log_type: "change",
    action: "update_avatar",
    entity: "user",
    entity_id: user.public_id,
  });
  return userObj;
};

/**
 * Update cover image
 */
const updateCoverImage = async (userId, coverFile) => {
  const user = await User.findByPk(userId);
  if (!user) throw new ApiError(404, "User not found");
  if (!coverFile) throw new ApiError(400, "Cover image file is required");

  const coverUrl = await uploadImageOnCloudinary(coverFile.path, "pocketpal/covers", user.username);
  user.coverImage = coverUrl?.secure_url || user.coverImage;
  await user.save({ validate: false });

  const userObj = { ...user.get() };
  delete userObj.password;
  delete userObj.refreshToken;
  delete userObj.user_id;
  await createLog({
    user_id: user.user_id,
    log_type: "change",
    action: "update_cover",
    entity: "user",
    entity_id: user.public_id,
  });
  return userObj;
};

/**
 * Update password after verifying current password
 */
const updatePassword = async (userId, currentPassword, newPassword) => {
  if (!currentPassword || !newPassword) throw new ApiError(400, "Both current and new passwords are required");
  if (newPassword.length < 8) throw new ApiError(400, "New password must be at least 8 characters long");

  const user = await User.scope("withSecrets").findByPk(userId);
  if (!user) throw new ApiError(404, "User not found");

  const match = await user.isPasswordCorrect(currentPassword);
  if (!match) throw new ApiError(401, "Current password is incorrect");

  user.password = newPassword;
  await user.save();
  await createLog({
    user_id: user.user_id,
    log_type: "change",
    action: "update_password",
    entity: "user",
    entity_id: user.public_id,
  });
  return true;
};

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
