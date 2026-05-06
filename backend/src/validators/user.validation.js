import Joi from "joi";

/** Username: 3–50 chars, lowercase alphanumeric + underscore (matches User model). */
const usernameSchema = Joi.string()
  .trim()
  .lowercase()
  .min(3)
  .max(50)
  .pattern(/^[a-z0-9_]+$/)
  .messages({
    "string.pattern.base": "Username may only contain lowercase letters, numbers, and underscores",
    "string.min": "Username must be at least 3 characters",
    "string.max": "Username must be at most 50 characters",
  });

/** Used for POST register: username, email, fullname, password. Files validated in controller. */
const registerSchema = Joi.object({
  username: usernameSchema.optional().empty(""),
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required()
    .messages({
      "string.email": "Please provide a valid email",
      "any.required": "Email is required",
    }),
  fullname: Joi.string()
    .trim()
    .min(2)
    .max(150)
    .required()
    .messages({
      "string.min": "Full name must be at least 2 characters",
      "string.max": "Full name must be at most 150 characters",
      "any.required": "Full name is required",
    }),
  password: Joi.string()
    .trim()
    .min(8)
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters long",
      "any.required": "Password is required",
    }),
}).options({ convert: true });

/** Used for POST login: email or username (at least one non-empty), and password. */
const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().optional().messages({
    "string.email": "Please provide a valid email",
  }),
  username: usernameSchema.optional(),
  password: Joi.string().trim().required().messages({
    "any.required": "Password is required",
  }),
})
  .or("email", "username")
  .messages({
    "object.missing": "Either email or username is required",
  })
  .options({ convert: true });

/** Used for PATCH profile: at least one of username, email, fullname. */
const updateProfileSchema = Joi.object({
  username: usernameSchema.optional(),
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .optional()
    .messages({
      "string.email": "Please provide a valid email",
    }),
  fullname: Joi.string().trim().min(2).max(150).optional().messages({
    "string.min": "Full name must be at least 2 characters",
    "string.max": "Full name must be at most 150 characters",
  }),
})
  .min(1)
  .messages({
    "object.min": "At least one field (username, email, fullname) must be provided",
  })
  .options({ convert: true });

/** Used for PATCH password: currentPassword and newPassword. */
const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "any.required": "Current password is required",
  }),
  newPassword: Joi.string()
    .trim()
    .min(8)
    .required()
    .messages({
      "string.min": "New password must be at least 8 characters long",
      "any.required": "New password is required",
    }),
})
  .options({ convert: true });

/** Used for path param :id on profile routes. Only "me" is allowed (current user). */
const userIdParamSchema = Joi.object({
  id: Joi.string()
    .valid("me")
    .required()
    .messages({
      "any.only": "User path must be 'me' for profile access",
      "any.required": "User path is required",
    }),
});

const validateRegister = (data) => registerSchema.validate(data, { abortEarly: false });
const validateLogin = (data) => loginSchema.validate(data, { abortEarly: false });
const validateUpdateProfile = (data) => updateProfileSchema.validate(data, { abortEarly: false });
const validateUpdatePassword = (data) => updatePasswordSchema.validate(data, { abortEarly: false });
const validateUserIdParam = (params) => userIdParamSchema.validate(params, { abortEarly: false });

export {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateUpdatePassword,
  validateUserIdParam,
};
