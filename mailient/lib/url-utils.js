/**
 * URL utility functions for validation and formatting
 */

/**
 * Validates if a string is a valid URL
 * @param {string|null|undefined} url - The URL to validate
 * @returns {boolean} - True if valid URL, false otherwise
 */
export function isValidUrl(url) {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }

  try {
    const urlString = url.trim();
    // Add protocol if missing
    const normalizedUrl = urlString.match(/^https?:\/\//i) ? urlString : `https://${urlString}`;
    new URL(normalizedUrl);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if a string is a valid URL (strict validation)
 * @param {string|null|undefined} url - The URL to validate
 * @returns {boolean} - True if valid URL, false otherwise
 */
export function isValidUrlStrict(url) {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }

  try {
    const urlString = url.trim();
    // Must have protocol
    if (!urlString.match(/^https?:\/\//i)) {
      return false;
    }
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalizes a URL by adding protocol if missing
 * @param {string|null|undefined} url - The URL to normalize
 * @returns {string|null} - Normalized URL or null if invalid
 */
export function normalizeUrl(url) {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return null;
  }

  try {
    const urlString = url.trim();
    const normalizedUrl = urlString.match(/^https?:\/\//i) ? urlString : `https://${urlString}`;
    new URL(normalizedUrl); // Validate
    return normalizedUrl;
  } catch {
    return null;
  }
}

/**
 * Extracts domain from URL
 * @param {string|null|undefined} url - The URL to extract domain from
 * @returns {string|null} - Domain name or null if invalid
 */
export function getDomainFromUrl(url) {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return null;
  }

  try {
    const urlString = url.trim();
    // Must have protocol for valid URL
    if (!urlString.match(/^https?:\/\//i)) {
      return null;
    }
    const urlObj = new URL(urlString);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Truncates URL for display purposes
 * @param {string|null|undefined} url - The URL to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string|null} - Truncated URL or null if invalid
 */
export function truncateUrl(url, maxLength = 30) {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return null;
  }

  const domain = getDomainFromUrl(url);
  if (!domain) {
    return url.length > maxLength ? `${url.substring(0, maxLength)}...` : url;
  }

  return domain.length > maxLength ? `${domain.substring(0, maxLength)}...` : domain;
}