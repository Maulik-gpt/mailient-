/**
 * Email utility functions for professional text rendering
 * Handles HTML entity decoding and content formatting
 */

/**
 * Decodes HTML entities in text for professional display
 */
const decodeHtmlEntities = (text) => {
  if (!text || typeof text !== 'string') return text;

  // Use browser's built-in decoding if available (client-side)
  if (typeof window !== 'undefined' && window.document) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  // Fallback manual decoding for server-side environments
  const entityMap = {
    // Basic entities
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '"',
    '&apos;': "'",
    '&#x27;': "'",

    // Typography
    '&nbsp;': ' ',
    '&#160;': ' ',
    '&ensp;': ' ',
    '&emsp;': ' ',
    '&thinsp;': ' ',
    '&hellip;': '…',
    '&#8230;': '…',
    '&ndash;': '–',
    '&mdash;': '—',
    '&#8211;': '–',
    '&#8212;': '—',

    // Quotes
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&#8220;': '"',
    '&#8221;': '"',
    '&lsquo;': "'",
    '&rsquo;': "'",
    '&#8216;': "'",
    '&#8217;': "'",

    // Symbols
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&#8482;': '™',
    '&cent;': '¢',
    '&pound;': '£',
    '&yen;': '¥',
    '&euro;': '€',
    '&curren;': '¤',
    '&sect;': '§',
    '&para;': '¶',
    '&dagger;': '†',
    '&Dagger;': '‡',
    '&bull;': '•',
    '&middot;': '·',

    // Mathematical
    '&plusmn;': '±',
    '&times;': '×',
    '&divide;': '÷',
    '&frac12;': '½',
    '&frac14;': '¼',
    '&frac34;': '¾',
    '&deg;': '°',
    '&sup1;': '¹',
    '&sup2;': '²',
    '&sup3;': '³',
    '&radic;': '√',
    '&infin;': '∞'
  };

  let decodedText = text;

  // Replace all HTML entities
  Object.entries(entityMap).forEach(([entity, replacement]) => {
    const regex = new RegExp(entity, 'g');
    decodedText = decodedText.replace(regex, replacement);
  });

  return decodedText;
};

/**
 * Formats email content for professional display
 * Removes potentially dangerous content while preserving readability
 */
const formatEmailContent = (htmlContent) => {
  if (!htmlContent) return htmlContent;

  // First decode HTML entities
  let decodedContent = decodeHtmlEntities(htmlContent);

  // Remove script and style tags for security
  decodedContent = decodedContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  decodedContent = decodedContent.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove HTML comments
  decodedContent = decodedContent.replace(/<!--[\s\S]*?-->/g, '');

  // Clean up excessive whitespace
  decodedContent = decodedContent.replace(/\s+/g, ' ');
  decodedContent = decodedContent.replace(/>\s+</g, '><');

  return decodedContent.trim();
};

/**
 * Extracts clean plain text from HTML content for previews
 */
const extractPlainText = (htmlContent) => {
  if (!htmlContent) return '';

  // First decode HTML entities
  let decodedContent = decodeHtmlEntities(htmlContent);

  // Remove HTML tags and clean up
  decodedContent = decodedContent.replace(/<[^>]*>/g, '');
  decodedContent = decodedContent.replace(/\s+/g, ' ').trim();

  return decodedContent;
};

/**
 * Creates a professional email preview with proper entity decoding
 */
const createEmailPreview = (emailContent, maxLength = 150) => {
  const plainText = extractPlainText(emailContent);

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return plainText.substring(0, maxLength).trim() + '...';
};

module.exports = {
  decodeHtmlEntities,
  formatEmailContent,
  extractPlainText,
  createEmailPreview
};