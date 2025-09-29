import { User } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { uploadImageOnCloudinary } from "../utils/cloudinary.js";
import { createLog } from "./log.service.js";

const registerUser = async ({ username, email, fullname, password, avatarFile, coverFile }) => {
  // Validate required fields
  if ([username, email, fullname, password].some((field) => field?.trim() === "")) {
    // TODO: Log error
    // await createLog({
    //   log_type: "error",
    //   action: "registerUser",
    //   entity: "users",
    //   message: "Missing required fields",
    //   details: { username, email },
    // });
    throw new ApiError(400, "Missing required fields");
  }

  // Check for existing user
  try {
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      // await createLog({
      //   log_type: "error",
      //   action: "registerUser",
      //   entity: "users",
      //   message: "Username already exists",
      //   details: { username },
      // });
      throw new ApiError(409, "Username already exists");
    }
  } catch (error) {
    // await createLog({
    //   log_type: "error",
    //   action: "registerUser",
    //   entity: "users",
    //   message: "Error checking existing username",
    //   details: { error: error.message || error },
    // });
    console.log("Error checking existing username:", error);
    throw new ApiError(500, "Internal server error");
  }

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new ApiError(409, "Email already exists");
    }
  } catch (error) {
    console.log("Error checking existing email:", error);
    throw new ApiError(500, "Internal server error");
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

export { registerUser };
