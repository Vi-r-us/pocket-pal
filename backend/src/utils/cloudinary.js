import { v2 as cloudinary } from "cloudinary";
import { log } from "console";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload image file to Cloudinary and cleanup local file.
 * @param {string} filePath - Absolute path to file.
 * @param {string} folder - Folder in Cloudinary (default: 'pocketpal').
 * @param {string} publicId - Optional desired public_id (will be sanitized). If provided it will be used as filename in Cloudinary.
 * @return {Promise<Object|null>} - Cloudinary upload result or null on failure.
 */
export const uploadImageOnCloudinary = async (filePath, folder = "pocketpal", publicId) => {
  try {
    if (!filePath) {
      console.log("File path is required");
      return null;
    }

    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(filePath)) {
      log("File does not exist at path:", filePath);
      return null;
    }

    // sanitize publicId: allow only letters, numbers, hyphen and underscore
    const sanitize = (value) =>
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_\-]/g, "");

    const options = {
      folder,
      use_filename: false, // we will set public_id explicitly
      unique_filename: false,
      overwrite: true,
      resource_type: "auto",
    };

    if (publicId) {
      // when public_id provided, it is relative to folder
      options.public_id = sanitize(publicId);
    }

    const result = await cloudinary.uploader.upload(absolutePath, options);
    console.log("Cloudinary upload result:", result);

    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (error) {}

    // Remove the file from local storage after upload

    return result;
  } catch (error) {
    // Remove the file from local storage if an error occurs
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error("Error uploading to Cloudinary:", error);
    return null;
  }
};
