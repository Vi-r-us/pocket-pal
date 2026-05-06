import { asyncHandler } from "../middlewares/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { commitImport, parseImportPreview } from "../services/import.service.js";
import { validateCommitImport, validateParseImportBody } from "../validators/import.validation.js";

const parseImport = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  const { error, value } = validateParseImportBody(req.body);
  if (error) {
    const message = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${message}`);
  }

  if (!req.file) {
    throw new ApiError(400, "Import file is required");
  }

  const result = await parseImportPreview({
    userId,
    importType: value.importType,
    file: req.file,
  });

  return res.status(200).json(new ApiResponse(200, result, "Import file parsed successfully"));
});

const commitImportedData = asyncHandler(async (req, res) => {
  const userId = req.user.user_id;

  if (
    req.body == null ||
    typeof req.body !== "object" ||
    Array.isArray(req.body) ||
    Object.keys(req.body).length === 0
  ) {
    throw new ApiError(400, "Request body is required");
  }

  const { error, value } = validateCommitImport(req.body);
  if (error) {
    const message = error.details.map((d) => d.message).join(", ");
    throw new ApiError(400, `Validation error: ${message}`);
  }

  const result = await commitImport({
    userId,
    importType: value.importType,
    sessionToken: value.sessionToken,
    fieldMapping: value.fieldMapping,
    options: value.options ?? {},
  });

  return res.status(200).json(new ApiResponse(200, result, "Import completed"));
});

export { parseImport, commitImportedData };
