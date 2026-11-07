/**
 * Escapes characters that have special meaning in regular expressions.
 * Protects against regex injection / catastrophic backtracking (ReDoS).
 *
 * @param {string} str - User-supplied search string
 * @returns {string} - Escaped string safe for new RegExp
 */
export const escapeRegex = (str) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
