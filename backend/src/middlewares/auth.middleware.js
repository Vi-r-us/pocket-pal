import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/index.js";
import { asyncHandler } from "./asyncHandler.js";

/**
 * Middleware to verify JWT and authenticate the user.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 */
export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    // Get the token from cookies or Authorization header
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    // If no token is provided, throw an unauthorized error
    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    // Verify the token using the secret key
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Find the user by ID and exclude password and refreshToken fields
    const user = await User.findByPk(decodedToken?.id);

    // If no user is found, throw an invalid access token error
    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }
    
    const userObj = { ...user.get() };
    delete userObj.password;
    delete userObj.refreshToken;

    // Attach the user to the request object
    req.user = userObj;
    next();
  } catch (error) {
    // If an error occurs, throw an unauthorized error with the error message
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
