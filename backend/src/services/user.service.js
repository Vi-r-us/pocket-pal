import { Op } from "sequelize";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { uploadImageOnCloudinary } from "../utils/cloudinary.js";
import { createLog } from "./log.service.js";
import handleServerError from "../utils/handleServerError.js";
import logger from "../utils/logger.js";

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
    handleServerError(error, "Failed to generate tokens", 500);
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
  try {
    logger.info({ username, email }, "registerUser called");
  
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
    if (password.trim().length < 8) {
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
  
    logger.info({ userId: newUser.user_id }, "User registered successfully");
  
    // Enqueue an audit log for user registration (non-blocking)
    try {
      const created = newUser.get({ plain: true }) || {};
      const newValue = {
        public_id: created.public_id || null,
        username: created.username || null,
        email: created.email || null,
        fullname: created.fullname || null,
        avatar: created.avatar || null,
        coverImage: created.coverImage || null,
      };
  
      void createLog({
        user_id: newUser.user_id,
        log_type: "audit",
        action: "user_register",
        entity: "users",
        entity_id: created.public_id || null,
        new_value: newValue,
        message: "New user registered",
        details: { source: "user.service.registerUser" },
      });
    } catch (e) {
      logger.error({ err: e }, "Failed to enqueue user registration audit log");
    }
  
    // Prepare response by removing sensitive fields
    const userObj = { ...newUser.get() };
    delete userObj.user_id;
    delete userObj.password;
    delete userObj.refreshToken;
  
    return userObj;
  } catch (error) {
    handleServerError(error, "Failed to register user", error.statusCode || 500);
  }
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
  logger.info({ email, username }, "loginUser called");

  try {
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
      try {
        void createLog({
          log_type: "error",
          action: "auth_failed",
          entity: "users",
          entity_id: null,
          message: "User not found during login",
          details: { source: "user.service.loginUser" },
        });
      } catch (e) {
        logger.error({ err: e }, "Failed to enqueue auth_failed log (user not found)");
      }
      throw new ApiError(404, "User not found");
    }
  
    // Check password
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      try {
        void createLog({
          user_id: user.user_id,
          log_type: "error",
          action: "auth_failed",
          entity: "users",
          entity_id: user.public_id || null,
          message: "Invalid password",
          details: { source: "user.service.loginUser" },
        });
      } catch (e) {
        logger.error({ err: e }, "Failed to enqueue auth_failed log (invalid password)");
      }
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
  
    // non-blocking audit log for successful login
    try {
      void createLog({
        user_id: user.user_id,
        log_type: "audit",
        action: "user_login",
        entity: "users",
        entity_id: user.public_id || null,
        message: "User logged in",
        details: { source: "user.service.loginUser" },
      });
    } catch (e) {
      logger.error({ err: e }, "Failed to enqueue user_login audit log");
    }
  
    logger.info({ userId: user.user_id, public_id: user.public_id }, "User logged in");
  
    // Return user data and tokens
    return { user: userObj, accessToken, refreshToken };
  } catch (error) {
    handleServerError(error, error.message || "Login failed", 401);
  }
};

/**
 * Logs out the user with the given user ID by setting the refresh token to null.
 *
 * @param {number} userId - The ID of the user to log out.
 * @returns {Promise<void>} - A promise that resolves when the user is logged out successfully.
 * @throws {ApiError} - If the user is not found or the logout process fails.
 */
const logoutUser = async (userId) => {
  logger.info({ userId }, "logoutUser called");

  try {
    // Find user by ID
    const user = await User.findByPk(userId);
  
    // set refresh token to null
    user.refreshToken = null;
    await user.save({ validate: false });
  
    // enqueue logout audit
    try {
      void createLog({
        user_id: user.user_id,
        log_type: "audit",
        action: "user_logout",
        entity: "users",
        entity_id: user.public_id || null,
        message: "User logged out",
        details: { source: "user.service.logoutUser" },
      });
    } catch (e) {
      logger.error({ err: e }, "Failed to enqueue user_logout audit log");
    }
  
    logger.info({ userId: user.user_id, public_id: user.public_id }, "User logged out");
  } catch (error) {
    handleServerError(error, error.message || "Logout failed", 401);
  }
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
  logger.info("refreshTokens called");
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

    logger.info({ userId: user.user_id, public_id: user.public_id }, "Tokens refreshed successfully");

    return { accessToken, refreshToken };
  } catch (error) {
    handleServerError(error, error.message || "Invalid refresh token", 401);
  }
};

/**
 * Retrieves the public profile for a user by primary key.
 *
 * Validates the incoming userId, fetches the user from the database,
 * strips sensitive fields (password, refreshToken, internal user_id) and
 * returns a safe plain object suitable for returning in API responses.
 *
 * @param {number|string} userId - Primary key (numeric or UUID) of the user to fetch.
 * @returns {Promise<Object>} - Safe user object without sensitive fields.
 * @throws {ApiError} - 400 if userId is missing, 404 if user not found, 500 for DB errors.
 */
const getProfile = async (userId) => {
  logger.info({ userId }, "getProfile called");

  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) throw new ApiError(404, "User not found");

    // get plain object and safely remove sensitive fields
    const userObj = user.get({ plain: true }) || {};
    const { password, refreshToken, user_id, ...safeUser } = userObj;

    logger.info({ userId: user.user_id, public_id: user.public_id }, "User profile fetched successfully");

    return safeUser;
  } catch (error) {
    handleServerError(error, "Failed to fetch user profile", 500);
  }
};

/**
 * Updates the profile fields (username, email, fullname) for a user.
 * The function validates the user ID and data, fetches the user from the database,
 * applies the allowed field updates, saves the changes, and enqueues a change log
 * if any fields were modified. It returns the updated user object without sensitive fields.
 *
 * @param {number} userId - The ID of the user whose profile is being updated.
 * @param {Object} data - An object containing the fields to update (username, email, fullname).
 * @returns {Promise<Object>} - The updated user object without sensitive fields.
 * @throws {ApiError} - If userId is missing, data is empty, user not found, or update fails.
 */
const updateProfile = async (userId, data = {}) => {
  logger.info({ userId, data }, "updateProfile called");

  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }

  if (Object.keys(data).length === 0) throw new ApiError(400, "Data is required");

  try {
    const user = await User.findByPk(userId);
    if (!user) throw new ApiError(404, "User not found");

    const allowed = ["username", "email", "fullname"];
    const before = user.get({ plain: true }) || {};
    allowed.forEach((key) => {
      if (data[key] !== undefined) user[key] = data[key];
    });
    await user.save();

    const after = user.get({ plain: true }) || {};
    const userObj = after;
    const { password, refreshToken, user_id, ...safeUser } = userObj;

    // prepare change diff
    const changedOld = {};
    const changedNew = {};
    allowed.forEach((key) => {
      if ((before[key] || null) !== (after[key] || null)) {
        changedOld[key] = before[key] ?? null;
        changedNew[key] = after[key] ?? null;
      }
    });

    // enqueue audit/change log if something changed
    if (Object.keys(changedNew).length > 0) {
      try {
        void createLog({
          user_id: user.user_id,
          log_type: "change",
          action: "update_profile",
          entity: "users",
          entity_id: after.public_id || null,
          field_name: Object.keys(changedNew).join(","),
          old_value: changedOld,
          new_value: changedNew,
          message: "Profile fields updated",
          details: { source: "user.service.updateProfile" },
        });
      } catch (e) {
        logger.error({ err: e }, "Failed to enqueue update_profile log");
      }
    }

    logger.info({ userId: user.user_id, public_id: user.public_id }, "User profile updated successfully");

    return safeUser;
  } catch (error) {
    handleServerError(error, "Failed to update profile", 500);
  }
};

/**
 * Updates the avatar image for a user.
 * The function validates the user ID and avatar file, fetches the user from the database,
 * uploads the image to Cloudinary, updates the user's avatar URL, saves the changes,
 * enqueues a change log, and returns the updated user object without sensitive fields.
 *
 * @param {number} userId - The ID of the user whose avatar is being updated.
 * @param {Express.Multer.File} avatarFile - The uploaded avatar file.
 * @returns {Promise<Object>} - The updated user object without sensitive fields.
 * @throws {ApiError} - If userId is missing, avatarFile is not provided, user not found, or update fails.
 */
const updateAvatar = async (userId, avatarFile) => {
  logger.info({ userId, avatarFile }, "updateAvatar called");

  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }
  if (!avatarFile) throw new ApiError(400, "Avatar file is required");

  try {
    const user = await User.findByPk(userId);
    if (!user) throw new ApiError(404, "User not found");

    const before = user.get({ plain: true }) || {};
    const avatarUrl = await uploadImageOnCloudinary(avatarFile.path, "pocketpal/avatars", user.username);
    user.avatar = avatarUrl?.secure_url || user.avatar;
    await user.save({ validate: false });

    // get plain object and safely remove sensitive fields
    const after = user.get({ plain: true }) || {};
    const userObj = after;
    const { password, refreshToken, user_id, ...safeUser } = userObj;

    // enqueue change log for avatar
    try {
      const oldVal = { avatar: before.avatar || null };
      const newVal = { avatar: after.avatar || null };
      void createLog({
        user_id: user.user_id,
        log_type: "change",
        action: "update_avatar",
        entity: "users",
        entity_id: after.public_id || null,
        field_name: "avatar",
        old_value: oldVal,
        new_value: newVal,
        message: "User avatar updated",
        details: { source: "user.service.updateAvatar" },
      });
    } catch (e) {
      logger.error({ err: e }, "Failed to enqueue update_avatar log");
    }

    logger.info({ userId: user.user_id, public_id: user.public_id }, "User avatar updated successfully");

    return safeUser;
  } catch (error) {
    handleServerError(error, "Failed to update avatar", 500);
  }
};

/**
 * Updates the cover image for a user.
 * The function validates the user ID and cover file, fetches the user from the database,
 * uploads the image to Cloudinary, updates the user's cover image URL, saves the changes,
 * enqueues a change log, and returns the updated user object without sensitive fields.
 *
 * @param {number} userId - The ID of the user whose cover image is being updated.
 * @param {Express.Multer.File} coverFile - The uploaded cover image file.
 * @returns {Promise<Object>} - The updated user object without sensitive fields.
 * @throws {ApiError} - If userId is missing, coverFile is not provided, user not found, or update fails.
 */
const updateCoverImage = async (userId, coverFile) => {
  logger.info({ userId, coverFile }, "updateCoverImage called");

  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(400, "User ID is required");
  }
  if (!coverFile) throw new ApiError(400, "Cover image file is required");

  try {
    const user = await User.findByPk(userId);
    if (!user) throw new ApiError(404, "User not found");

    const before = user.get({ plain: true }) || {};
    const coverUrl = await uploadImageOnCloudinary(coverFile.path, "pocketpal/covers", user.username);
    user.coverImage = coverUrl?.secure_url || user.coverImage;
    await user.save({ validate: false });

    // get plain object and safely remove sensitive fields
    const after = user.get({ plain: true }) || {};
    const userObj = after;
    const { password, refreshToken, user_id, ...safeUser } = userObj;

    // enqueue change log for cover image
    try {
      const oldVal = { coverImage: before.coverImage || null };
      const newVal = { coverImage: after.coverImage || null };
      void createLog({
        user_id: user.user_id,
        log_type: "change",
        action: "update_cover",
        entity: "users",
        entity_id: after.public_id || null,
        field_name: "coverImage",
        old_value: oldVal,
        new_value: newVal,
        message: "User cover image updated",
        details: { source: "user.service.updateCoverImage" },
      });
    } catch (e) {
      logger.error({ err: e }, "Failed to enqueue update_cover log");
    }

    logger.info({ userId: user.user_id, public_id: user.public_id }, "User cover image updated successfully");

    return safeUser;
  } catch (error) {
    handleServerError(error, "Failed to update cover image", 500);
  }
};

/**
 * Updates the password for a user after verifying the current password.
 * The function validates the user ID, current password, and new password, fetches the user
 * from the database with secrets, verifies the current password, updates the password,
 * saves the changes, enqueues an audit log, and returns true on success.
 *
 * @param {number} userId - The ID of the user whose password is being updated.
 * @param {string} currentPassword - The user's current password for verification.
 * @param {string} newPassword - The new password to set.
 * @returns {Promise<boolean>} - True if the password was updated successfully.
 * @throws {ApiError} - If passwords are missing, new password is invalid, current password is incorrect, user not found, or update fails.
 */
const updatePassword = async (userId, currentPassword, newPassword) => {
  logger.info({ userId }, "updatePassword called");
  
  if (!currentPassword || !newPassword) throw new ApiError(400, "Both current and new passwords are required");
  if (currentPassword.trim() === newPassword.trim())
    throw new ApiError(400, "New password must be different from current password");
  if (newPassword.trim().length < 8) throw new ApiError(400, "New password must be at least 8 characters long");

  try {
    const user = await User.scope("withSecrets").findByPk(userId);
    if (!user) throw new ApiError(404, "User not found");

    const match = await user.isPasswordCorrect(currentPassword);
    if (!match) throw new ApiError(401, "Current password is incorrect");

    user.password = newPassword.trim();
    await user.save();

    // enqueue password change audit log (do not include password values)
    try {
      void createLog({
        user_id: user.user_id,
        log_type: "audit",
        action: "update_password",
        entity: "users",
        entity_id: user.public_id || null,
        message: "User password changed",
        details: { source: "user.service.updatePassword" },
      });
    } catch (e) {
      logger.error({ err: e }, "Failed to enqueue update_password log");
    }

    logger.info({ userId: user.user_id, public_id: user.public_id }, "User password updated successfully");

    return true;
  } catch (error) {
    handleServerError(error, "Failed to update password", 500);
  }
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
