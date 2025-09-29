class ApiResponse {
  /**
   * Constructs a new ApiResponse object.
   *
   * @param {number} statusCode - The HTTP status code for the response.
   * @param {*} data - The data to be included in the response.
   * @param {string} [message="Success"] - The message to be included in the response.
   */
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400; // Indicates that the response is successful
  } 
}

export default ApiResponse;