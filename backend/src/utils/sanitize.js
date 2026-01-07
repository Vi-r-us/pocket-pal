/**
 * Capitalizes the first letter of each word in a string (title case).
 * @param {string} str - The input string to capitalize.
 * @returns {string} The capitalized string.
 */
const capitalizeTitleCase = (str) => {
  if (!str || typeof str !== 'string') return str;
  return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

export { capitalizeTitleCase };