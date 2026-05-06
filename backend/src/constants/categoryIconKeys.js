import { dirname, join } from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {{ allowedKeys: string[] }} */
const raw = JSON.parse(readFileSync(join(__dirname, "category-icon-data.json"), "utf8"));

export const ALLOWED_CATEGORY_ICON_KEYS = raw.allowedKeys;

/**
 * Returns true only for values allowed to be stored as icon_key (valid key or null clear).
 */
export const isAllowedCategoryIconKey = (value) => {
  if (value === null || value === undefined) {
    return true;
  }
  return typeof value === "string" && ALLOWED_CATEGORY_ICON_KEYS.includes(value);
};
