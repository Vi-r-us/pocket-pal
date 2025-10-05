import { Op } from "sequelize";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { uploadImageOnCloudinary } from "../utils/cloudinary.js";
import { createLog } from "./log.service.js";

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

const logoutUser = async (userId) => {
  // Find user by ID
  const user = await User.findByPk(userId);

  // set refresh token to null
  user.refreshToken = null;
  await user.save({ validate: false });
};

const refreshTokens = async (incomingRefreshToken) => {
  try {
    // Verify the refresh token using the secret key
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Find user by ID from the decoded token
    const user = await User.scope('withSecrets').findByPk(decodedToken?.id);

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

export { registerUser, loginUser, logoutUser, refreshTokens };
