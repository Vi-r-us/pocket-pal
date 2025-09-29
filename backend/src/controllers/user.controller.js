import { registerUser as registerUserService } from "../services/user.service.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  const userData = {
    ...req.body,
    avatarFile: req.files?.avatar?.[0] || null,
    coverFile: req.files?.coverImage?.[0] || null,
  };

  const newUser = await registerUserService(userData);
  return res.status(201).json(new ApiResponse(201, newUser, "User registered successfully"));
});

export { registerUser };
