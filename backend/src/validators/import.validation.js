import Joi from "joi";

const IMPORT_TYPES = ["transactions", "accounts", "budgets", "categories"];

const parseImportBodySchema = Joi.object({
  importType: Joi.string()
    .trim()
    .lowercase()
    .valid(...IMPORT_TYPES)
    .required()
    .messages({
      "any.only": `importType must be one of: ${IMPORT_TYPES.join(", ")}`,
      "any.required": "importType is required",
    }),
}).options({ convert: true });

const commitImportSchema = Joi.object({
  sessionToken: Joi.string().trim().required().messages({
    "any.required": "sessionToken is required",
  }),
  importType: Joi.string()
    .trim()
    .lowercase()
    .valid(...IMPORT_TYPES)
    .required()
    .messages({
      "any.only": `importType must be one of: ${IMPORT_TYPES.join(", ")}`,
      "any.required": "importType is required",
    }),
  fieldMapping: Joi.object()
    .pattern(Joi.string().trim().min(1), Joi.string().trim().min(1))
    .required()
    .messages({
      "any.required": "fieldMapping is required",
    }),
  options: Joi.object({
    skipDuplicates: Joi.boolean().optional().default(true),
  })
    .optional()
    .default({ skipDuplicates: true }),
}).options({ convert: true });

const validateParseImportBody = (data) => parseImportBodySchema.validate(data, { abortEarly: false });
const validateCommitImport = (data) => commitImportSchema.validate(data, { abortEarly: false });

export { IMPORT_TYPES, validateParseImportBody, validateCommitImport };
