import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import XLSX from "xlsx";
import { Op } from "sequelize";
import ApiError from "../utils/ApiError.js";
import handleServerError from "../utils/handleServerError.js";
import { Account, Category } from "../models/index.js";
import { createAccount } from "./account.service.js";
import { createCategory } from "./category.service.js";
import { createTransaction } from "./transaction.service.js";
import { putBudgetMonth } from "./budget.service.js";

const IMPORT_SESSION_TTL_MS = 1000 * 60 * 30;
const IMPORT_MAX_ROWS = 2000;
const IMPORT_SAMPLE_ROWS = 20;

const importSessions = new Map();

const IMPORT_FIELD_CATALOG = {
  transactions: {
    requiredFields: [
      { key: "account_name", label: "Account Name" },
      { key: "category_name", label: "Category Name" },
      { key: "amount_minor", label: "Amount (minor units)" },
      { key: "type", label: "Transaction Type" },
    ],
    optionalFields: [
      { key: "currency", label: "Currency (ISO code)" },
      { key: "description", label: "Description" },
      { key: "source", label: "Source" },
      { key: "timestamp", label: "Timestamp (ISO)" },
    ],
  },
  accounts: {
    requiredFields: [
      { key: "name", label: "Account Name" },
      { key: "type", label: "Account Type" },
      { key: "currency_code", label: "Currency Code" },
    ],
    optionalFields: [
      { key: "opening_balance_minor", label: "Opening Balance (minor units)" },
      { key: "institution_name", label: "Institution Name" },
      { key: "account_number_last4", label: "Last 4 Digits" },
      { key: "notes", label: "Notes" },
    ],
  },
  categories: {
    requiredFields: [
      { key: "name", label: "Category Name" },
      { key: "type", label: "Category Type" },
    ],
    optionalFields: [{ key: "icon_key", label: "Icon Key" }],
  },
  budgets: {
    requiredFields: [
      { key: "yyyy_mm", label: "Budget Month (YYYYMM)" },
      { key: "category_name", label: "Category Name" },
      { key: "amount_minor", label: "Amount (minor units)" },
    ],
    optionalFields: [],
  },
};

const cleanupExpiredSessions = () => {
  const now = Date.now();
  for (const [token, session] of importSessions.entries()) {
    if (session.expiresAt <= now) {
      importSessions.delete(token);
    }
  }
};

const assertImportType = (importType) => {
  const catalog = IMPORT_FIELD_CATALOG[importType];
  if (!catalog) {
    throw new ApiError(400, "Unsupported importType");
  }
  return catalog;
};

const normalizeCell = (value) => {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
};

const parseJsonRows = (buffer) => {
  let parsed;
  try {
    parsed = JSON.parse(buffer.toString("utf-8"));
  } catch {
    throw new ApiError(400, "Invalid JSON file");
  }

  const rows = Array.isArray(parsed) ? parsed : parsed?.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ApiError(400, "JSON import must contain an array of rows");
  }

  const sourceColumns = Array.from(
    rows.reduce((set, row) => {
      if (row && typeof row === "object" && !Array.isArray(row)) {
        Object.keys(row).forEach((key) => set.add(String(key).trim()));
      }
      return set;
    }, new Set())
  );

  if (sourceColumns.length === 0) {
    throw new ApiError(400, "Could not detect columns in JSON file");
  }

  const normalizedRows = rows.map((row) => {
    const record = {};
    sourceColumns.forEach((column) => {
      record[column] = normalizeCell(row?.[column]);
    });
    return record;
  });

  return { sourceColumns, rows: normalizedRows };
};

const parseSheetRows = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new ApiError(400, "No worksheets found in uploaded file");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (!Array.isArray(matrix) || matrix.length < 2) {
    throw new ApiError(400, "File must include a header row and at least one data row");
  }

  const headerRow = matrix[0];
  const sourceColumns = headerRow.map((col, idx) => String(col || `column_${idx + 1}`).trim());
  const dataRows = matrix.slice(1);

  const normalizedRows = dataRows.map((cells) => {
    const record = {};
    sourceColumns.forEach((column, index) => {
      record[column] = normalizeCell(cells?.[index]);
    });
    return record;
  });

  return { sourceColumns, rows: normalizedRows };
};

const parseUploadedFile = async (file) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const buffer = await fs.readFile(file.path);

  if (ext === ".json" || file.mimetype === "application/json") {
    return parseJsonRows(buffer);
  }

  if (
    ext === ".xlsx" ||
    ext === ".xls" ||
    ext === ".csv" ||
    file.mimetype.includes("spreadsheet") ||
    file.mimetype.includes("csv")
  ) {
    return parseSheetRows(buffer);
  }

  throw new ApiError(400, "Unsupported file format. Use .xlsx, .csv, or .json");
};

const parseInteger = (value) => {
  if (value == null || value === "") return null;
  const normalized = String(value).replace(/,/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
};

const parseYyyyMm = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length === 6) return Number(digits);
  return null;
};

const getMappedValue = (row, fieldMapping, targetField) => {
  const sourceColumn = fieldMapping[targetField];
  if (!sourceColumn) return "";
  return normalizeCell(row[sourceColumn]);
};

const createImportSession = ({ importType, sourceColumns, rows }) => {
  cleanupExpiredSessions();
  const sessionToken = randomUUID();
  importSessions.set(sessionToken, {
    importType,
    sourceColumns,
    rows,
    createdAt: Date.now(),
    expiresAt: Date.now() + IMPORT_SESSION_TTL_MS,
  });
  return sessionToken;
};

const resolveCategoryByName = async (userId, name) => {
  return Category.findOne({
    where: {
      [Op.or]: [{ user_id: null }, { user_id: userId }],
      [Op.and]: [{ name: { [Op.iLike]: name.trim() } }],
    },
  });
};

const parseImportPreview = async ({ importType, file }) => {
  try {
    const catalog = assertImportType(importType);
    if (!file) {
      throw new ApiError(400, "Import file is required");
    }

    const { sourceColumns, rows } = await parseUploadedFile(file);
    if (!rows.length) {
      throw new ApiError(400, "No data rows found in file");
    }
    if (rows.length > IMPORT_MAX_ROWS) {
      throw new ApiError(400, `File has too many rows. Max ${IMPORT_MAX_ROWS} rows allowed`);
    }

    const sampleRows = rows.slice(0, IMPORT_SAMPLE_ROWS);
    const sessionToken = createImportSession({ importType, sourceColumns, rows });

    return {
      importType,
      sourceColumns,
      requiredFields: catalog.requiredFields,
      optionalFields: catalog.optionalFields,
      sampleRows,
      totalRows: rows.length,
      sessionToken,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw handleServerError(error, "Error parsing import file", 500);
  } finally {
    if (file?.path) {
      await fs.unlink(file.path).catch(() => null);
    }
  }
};

const commitAccounts = async ({ userId, rows, fieldMapping, options }) => {
  let imported = 0;
  let skipped = 0;
  const errors = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const name = getMappedValue(row, fieldMapping, "name");
    const type = getMappedValue(row, fieldMapping, "type");
    const currency_code = getMappedValue(row, fieldMapping, "currency_code").toUpperCase();

    if (!name || !type || !currency_code) {
      errors.push({ row: index + 1, message: "Missing required account fields" });
      continue;
    }

    try {
      await createAccount(userId, {
        name,
        type,
        currency_code,
        opening_balance_minor: parseInteger(getMappedValue(row, fieldMapping, "opening_balance_minor")) ?? 0,
        institution_name: getMappedValue(row, fieldMapping, "institution_name") || undefined,
        account_number_last4: getMappedValue(row, fieldMapping, "account_number_last4") || undefined,
        notes: getMappedValue(row, fieldMapping, "notes") || undefined,
      });
      imported += 1;
    } catch (error) {
      if (options.skipDuplicates && error?.statusCode === 409) {
        skipped += 1;
      } else {
        errors.push({ row: index + 1, message: error.message || "Failed to import account" });
      }
    }
  }

  return { imported, skipped, errors };
};

const commitCategories = async ({ userId, rows, fieldMapping, options }) => {
  let imported = 0;
  let skipped = 0;
  const errors = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const name = getMappedValue(row, fieldMapping, "name");
    const type = getMappedValue(row, fieldMapping, "type");

    if (!name || !type) {
      errors.push({ row: index + 1, message: "Missing required category fields" });
      continue;
    }

    try {
      await createCategory(userId, {
        name,
        type,
        iconKey: getMappedValue(row, fieldMapping, "icon_key") || undefined,
      });
      imported += 1;
    } catch (error) {
      if (options.skipDuplicates && String(error.message || "").toLowerCase().includes("already exists")) {
        skipped += 1;
      } else {
        errors.push({ row: index + 1, message: error.message || "Failed to import category" });
      }
    }
  }

  return { imported, skipped, errors };
};

const commitTransactions = async ({ userId, rows, fieldMapping }) => {
  let imported = 0;
  const errors = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const accountName = getMappedValue(row, fieldMapping, "account_name");
    const categoryName = getMappedValue(row, fieldMapping, "category_name");
    const amountMinor = parseInteger(getMappedValue(row, fieldMapping, "amount_minor"));
    const type = getMappedValue(row, fieldMapping, "type");

    if (!accountName || !categoryName || amountMinor == null || !type) {
      errors.push({ row: index + 1, message: "Missing required transaction fields" });
      continue;
    }

    try {
      const account = await Account.findOne({
        where: {
          user_id: userId,
          [Op.and]: [{ name: { [Op.iLike]: accountName.trim() } }],
        },
      });
      if (!account) {
        errors.push({ row: index + 1, message: `Account not found: ${accountName}` });
        continue;
      }

      const category = await resolveCategoryByName(userId, categoryName);
      if (!category) {
        errors.push({ row: index + 1, message: `Category not found: ${categoryName}` });
        continue;
      }

      await createTransaction(userId, {
        account_id: account.account_id,
        category_id: category.category_id,
        amount_minor: amountMinor,
        type,
        currency: getMappedValue(row, fieldMapping, "currency") || undefined,
        description: getMappedValue(row, fieldMapping, "description") || undefined,
        source: getMappedValue(row, fieldMapping, "source") || "external",
        timestamp: getMappedValue(row, fieldMapping, "timestamp") || undefined,
      });
      imported += 1;
    } catch (error) {
      errors.push({ row: index + 1, message: error.message || "Failed to import transaction" });
    }
  }

  return { imported, skipped: 0, errors };
};

const commitBudgets = async ({ userId, rows, fieldMapping }) => {
  const groupedByMonth = new Map();
  const errors = [];
  let imported = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const yyyyMm = parseYyyyMm(getMappedValue(row, fieldMapping, "yyyy_mm"));
    const categoryName = getMappedValue(row, fieldMapping, "category_name");
    const amountMinor = parseInteger(getMappedValue(row, fieldMapping, "amount_minor"));

    if (!yyyyMm || !categoryName || amountMinor == null) {
      errors.push({ row: index + 1, message: "Missing required budget fields" });
      continue;
    }

    const category = await resolveCategoryByName(userId, categoryName);
    if (!category) {
      errors.push({ row: index + 1, message: `Category not found: ${categoryName}` });
      continue;
    }

    const monthKey = String(yyyyMm);
    const monthItems = groupedByMonth.get(monthKey) ?? new Map();
    monthItems.set(category.category_id, (monthItems.get(category.category_id) ?? 0) + amountMinor);
    groupedByMonth.set(monthKey, monthItems);
    imported += 1;
  }

  for (const [monthKey, categoryMap] of groupedByMonth.entries()) {
    await putBudgetMonth(userId, Number(monthKey), {
      categoryBudgets: Array.from(categoryMap.entries()).map(([categoryId, amount]) => ({
        category_id: categoryId,
        amount_minor: amount,
      })),
    });
  }

  return { imported, skipped: 0, errors };
};

const commitImport = async ({ userId, importType, sessionToken, fieldMapping, options }) => {
  cleanupExpiredSessions();
  const session = importSessions.get(sessionToken);

  if (!session) {
    throw new ApiError(400, "Import session expired or invalid. Please upload file again.");
  }
  if (session.importType !== importType) {
    throw new ApiError(400, "Import type does not match upload session");
  }

  try {
    let result;
    if (importType === "accounts") {
      result = await commitAccounts({ userId, rows: session.rows, fieldMapping, options });
    } else if (importType === "categories") {
      result = await commitCategories({ userId, rows: session.rows, fieldMapping, options });
    } else if (importType === "transactions") {
      result = await commitTransactions({ userId, rows: session.rows, fieldMapping, options });
    } else if (importType === "budgets") {
      result = await commitBudgets({ userId, rows: session.rows, fieldMapping, options });
    } else {
      throw new ApiError(400, "Unsupported importType");
    }

    importSessions.delete(sessionToken);

    return {
      importType,
      totalRows: session.rows.length,
      importedRows: result.imported,
      skippedRows: result.skipped,
      failedRows: result.errors.length,
      errors: result.errors.slice(0, 100),
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw handleServerError(error, "Error importing data", 500);
  }
};

export { parseImportPreview, commitImport };
