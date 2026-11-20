// Bunny Storage helpers — used by properties, edit, and user routes
const axios = require("axios");
const mime = require("mime-types");
const path = require("path");
const validator = require("validator");

const UPLOAD_TIMEOUT_MS = 30000;
const DELETE_TIMEOUT_MS = 10000;
const DEFAULT_DIRECTORY = "uploads";

const validateBunnyConfig = () => {
  const missing = [];
  if (!process.env.BUNNY_STORAGE_ZONE) missing.push("BUNNY_STORAGE_ZONE");
  if (!process.env.BUNNY_ACCESS_KEY) missing.push("BUNNY_ACCESS_KEY");
  if (!process.env.BUNNY_CDN_HOSTNAME) missing.push("BUNNY_CDN_HOSTNAME");
  if (missing.length > 0) {
    throw new Error(`Missing Bunny configuration: ${missing.join(", ")}`);
  }
};

const validateFileInput = (fileBuffer, fileName) => {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    throw new Error("File buffer is required and cannot be empty");
  }
  if (!fileName || typeof fileName !== "string" || !fileName.trim()) {
    throw new Error("File name is required");
  }
};

const validateDirectory = (directory) => {
  if (!directory || typeof directory !== "string" || !directory.trim()) {
    throw new Error("Storage directory is required");
  }
  if (!/^[a-zA-Z0-9/_-]+$/.test(directory)) {
    throw new Error("Invalid storage directory name");
  }
};

const buildUniqueFileName = (fileName) => {
  const sanitized = validator.escape(fileName.trim());
  const ext = path.extname(sanitized);
  const base = path.basename(sanitized, ext);
  return `${base}-${Date.now()}${ext}`;
};

const buildStorageUrl = (directory, fileName) =>
  `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/${directory}/${fileName}`;

const buildCdnUrl = (directory, fileName) =>
  `https://${process.env.BUNNY_CDN_HOSTNAME}/${directory}/${fileName}`;

// Upload a new file to Bunny Storage
const uploadFile = async (fileBuffer, fileName, directory = DEFAULT_DIRECTORY) => {
  try {
    validateBunnyConfig();
    validateFileInput(fileBuffer, fileName);
    validateDirectory(directory);

    const uniqueFileName = buildUniqueFileName(fileName);
    const contentType = mime.lookup(fileName.trim()) || "application/octet-stream";

    const response = await axios.put(buildStorageUrl(directory, uniqueFileName), fileBuffer, {
      headers: {
        AccessKey: process.env.BUNNY_ACCESS_KEY,
        "Content-Type": contentType,
      },
      timeout: UPLOAD_TIMEOUT_MS,
    });

    if (response.status !== 201) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }

    return {
      success: true,
      url: buildCdnUrl(directory, uniqueFileName),
      fileName: uniqueFileName,
      originalName: fileName,
      size: fileBuffer.length,
      contentType,
    };
  } catch (error) {
    console.error("Bunny CDN upload error:", error.message);
    throw new Error(`Upload failed: ${error.message}`);
  }
};

// Delete a file from Bunny Storage (returns success flag, does not throw)
const deleteFile = async (fileName, directory = DEFAULT_DIRECTORY) => {
  try {
    validateBunnyConfig();
    validateDirectory(directory);
    if (!fileName || typeof fileName !== "string" || !fileName.trim()) {
      throw new Error("File name is required for delete");
    }

    await axios.delete(buildStorageUrl(directory, fileName.trim()), {
      headers: { AccessKey: process.env.BUNNY_ACCESS_KEY },
      timeout: DELETE_TIMEOUT_MS,
    });

    return { success: true };
  } catch (error) {
    console.error("Bunny CDN delete error:", error.message);
    return { success: false, error: error.message };
  }
};

// Upload a new file and remove the old one (used for profile image updates)
const replaceFile = async (fileBuffer, fileName, directory = DEFAULT_DIRECTORY, oldFileName = null) => {
  const uploadResult = await uploadFile(fileBuffer, fileName, directory);

  if (oldFileName) {
    const deleteResult = await deleteFile(oldFileName, directory);
    if (!deleteResult.success) {
      console.error(`Failed to delete old file "${oldFileName}":`, deleteResult.error);
    }
  }

  return uploadResult;
};

module.exports = {
  uploadFile,
  deleteFile,
  replaceFile,
};
