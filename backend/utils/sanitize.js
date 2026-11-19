/**
 * Safely escapes characters with special meaning in Regular Expressions.
 * Prevents ReDoS (Regular Expression Denial of Service) and unintended regex pattern matching.
 * 
 * @param {string} str - User-supplied string to escape
 * @returns {string} - Escaped string safe to use inside new RegExp(...) or MongoDB $regex
 */
export const escapeRegex = (str) => {
  if (typeof str !== 'string') {
    if (str === null || str === undefined) return '';
    return String(str);
  }
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Validates whether a given string is a valid year-month string (YYYY-MM).
 * @param {string} monthStr
 * @returns {boolean}
 */
export const isValidMonth = (monthStr) => {
  if (typeof monthStr !== 'string') return false;
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(monthStr.trim());
};

/**
 * Validates whether a given string is a valid date string (YYYY-MM-DD).
 * @param {string} dateStr
 * @returns {boolean}
 */
export const isValidDate = (dateStr) => {
  if (typeof dateStr !== 'string') return false;
  return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(dateStr.trim());
};
