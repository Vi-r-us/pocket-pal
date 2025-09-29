/**
 * @fileoverview This file defines the middleware for handling file uploads using Multer in the YouTube redesign backend application.
 * It includes the storage configuration for saving uploaded files to a temporary directory.
 */

import multer from "multer";

// Configure storage settings for Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Set the destination directory for uploaded files
    cb(null, "./public/uploads");
  },
  filename: function (req, file, cb) {
    // Set the filename for uploaded files
    cb(null, file.originalname);
  },
});

// Export the configured Multer instance
export const upload = multer({
  storage,
});
