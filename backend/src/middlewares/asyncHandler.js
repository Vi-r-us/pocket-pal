
/**
 * Middleware function that wraps another request handler function and
 * handles any synchronous or asynchronous errors that occur during the
 * request. If an error is thrown, it will be passed to the next middleware
 * function. If the request handler function returns a promise, it will be
 * resolved.
 *
 * @param {function} requestHandler - The request handler function to be wrapped
 * @return {function} The wrapped request handler function
 */
export const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};
