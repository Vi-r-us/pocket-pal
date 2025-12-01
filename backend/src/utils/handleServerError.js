import ApiError from "./ApiError.js";

/**
 * Wrap unexpected errors in ApiError while preserving ApiError instances.
 * @param {Error} err
 * @param {string} defaultMessage
 * @param {number} defaultStatus
 */
export default function handleServerError(err, defaultMessage = "Internal Server Error", defaultStatus = 500) {
  if (err instanceof ApiError) throw err;
  // include original message for debugging and original stack
  const errors = [err?.message || String(err)];
  throw new ApiError(defaultStatus, defaultMessage, errors, err?.stack || "");
}
