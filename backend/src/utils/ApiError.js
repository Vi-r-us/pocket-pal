class ApiError extends Error {
  /**
   * Creates an ApiError instance.
   *
   * @param {number} statusCode - The HTTP status code for the error.
   * @param {string} [message="Something went wrong"] - The error message.
   * @param {array} [error=[]] - Additional error information.
   * @param {string} [stack=""] - The stack trace of the error.
   */
  constructor(statusCode, message = "Something went wrong", errors = [], stack = "") {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.isOperational = true; // Indicates that the error is operational and not a programming error
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default ApiError;
