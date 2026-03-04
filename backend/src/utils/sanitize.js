/**
 * Capitalizes the first letter of each word in a string (title case).
 * @param {string} str - The input string to capitalize.
 * @returns {string} The capitalized string.
 */
const capitalizeTitleCase = (str) => {
  if (!str || typeof str !== 'string') return str;
  return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

/**
 * Sanitizes a date to a valid date string format YYYY-MM-DD HH:MM:SS.
 * @param {Date} date - The date object to sanitize.
 * @returns {string} The sanitized date string.
 */
const sanitizeDate = (date) => {
  if (!date || !(date instanceof Date)) return date;
  return date.toISOString().replace("Z", "").replace("T", " ");
};

export { capitalizeTitleCase, sanitizeDate };