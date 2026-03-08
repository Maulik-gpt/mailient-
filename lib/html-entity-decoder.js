/**
 * Comprehensive HTML Entity Decoder for Professional Email Rendering
 * Decodes HTML entities to ensure professional text display in emails
 */

const decodeHtmlEntities = (text) => {
  if (!text || typeof text !== 'string') return text;

  // Create a temporary DOM element to leverage browser's built-in decoding
  if (typeof window !== 'undefined' && window.document) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  // Fallback manual decoding for server-side or when DOM is not available
  const entityMap = {
    // Quotes
    '&apos;': "'",
    '&#x27;': "'",
    '&apos;': "'",
    '&#34;': '"',
    '&#x22;': '"',
    '"': '"',
    '&#8220;': '"', // Left double quotation mark
    '&#8221;': '"', // Right double quotation mark
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&#8216;': "'", // Left single quotation mark
    '&#8217;': "'", // Right single quotation mark
    '&lsquo;': "'",
    '&rsquo;': "'",
    '&#8242;': "'", // Prime
    '&#8243;': '"', // Double prime

    // Dashes and hyphens
    '&#8230;': '…', // Horizontal ellipsis
    '&hellip;': '…',
    '&#8212;': '—', // Em dash
    '&mdash;': '—',
    '&#8211;': '-', // En dash
    '&ndash;': '–',
    '&#8208;': '-', // Hyphen
    '&hyphen;': '‐',

    // Spaces
    '&nbsp;': ' ',
    '&#160;': ' ',
    '&#8194;': ' ', // Thin space
    '&#8195;': ' ', // Hair space
    '&ensp;': ' ',  // En space
    '&emsp;': ' ',  // Em space

    // Special characters
    '&': '&',
    '<': '<',
    '>': '>',
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

    // Mathematical symbols
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
    '&infin;': '∞',

    // Arrows
    '&larr;': '←',
    '&rarr;': '→',
    '&uarr;': '↑',
    '&darr;': '↓',
    '&harr;': '↔',
    '&crarr;': '↵',
    '&lArr;': '⇐',
    '&rArr;': '⇒',
    '&uArr;': '⇑',
    '&dArr;': '⇓',

    // Accented characters (common ones)
    '&agrave;': 'à',
    '&aacute;': 'á',
    '&acirc;': 'â',
    '&atilde;': 'ã',
    '&auml;': 'ä',
    '&aring;': 'å',
    '&aelig;': 'æ',
    '&ccedil;': 'ç',
    '&egrave;': 'è',
    '&eacute;': 'é',
    '&ecirc;': 'ê',
    '&euml;': 'ë',
    '&igrave;': 'ì',
    '&iacute;': 'í',
    '&icirc;': 'î',
    '&iuml;': 'ï',
    '&eth;': 'ð',
    '&ntilde;': 'ñ',
    '&ograve;': 'ò',
    '&oacute;': 'ó',
    '&ocirc;': 'ô',
    '&otilde;': 'õ',
    '&ouml;': 'ö',
    '&oslash;': 'ø',
    '&ugrave;': 'ù',
    '&uacute;': 'ú',
    '&ucirc;': 'û',
    '&uuml;': 'ü',
    '&yacute;': 'ý',
    '&thorn;': 'þ',
    '&yuml;': 'ÿ',

    // HTML5 named entities
    '&Alpha;': 'Α',
    '&Beta;': 'Β',
    '&Gamma;': 'Γ',
    '&Delta;': 'Δ',
    '&Epsilon;': 'Ε',
    '&Zeta;': 'Ζ',
    '&Eta;': 'Η',
    '&Theta;': 'Θ',
    '&Iota;': 'Ι',
    '&Kappa;': 'Κ',
    '&Lambda;': 'Λ',
    '&Mu;': 'Μ',
    '&Nu;': 'Ν',
    '&Xi;': 'Ξ',
    '&Omicron;': 'Ο',
    '&Pi;': 'Π',
    '&Rho;': 'Ρ',
    '&Sigma;': 'Σ',
    '&Tau;': 'Τ',
    '&Upsilon;': 'Υ',
    '&Phi;': 'Φ',
    '&Chi;': 'Χ',
    '&Psi;': 'Ψ',
    '&Omega;': 'Ω',
    '&alpha;': 'α',
    '&beta;': 'β',
    '&gamma;': 'γ',
    '&delta;': 'δ',
    '&epsilon;': 'ε',
    '&zeta;': 'ζ',
    '&eta;': 'η',
    '&theta;': 'θ',
    '&iota;': 'ι',
    '&kappa;': 'κ',
    '&lambda;': 'λ',
    '&mu;': 'μ',
    '&nu;': 'ν',
    '&xi;': 'ξ',
    '&omicron;': 'ο',
    '&pi;': 'π',
    '&rho;': 'ρ',
    '&sigma;': 'σ',
    '&tau;': 'τ',
    '&upsilon;': 'υ',
    '&phi;': 'φ',
    '&chi;': 'χ',
    '&psi;': 'ψ',
    '&omega;': 'ω'
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
 * Removes unnecessary HTML tags while preserving structure
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

  // Clean up excessive whitespace and line breaks
  decodedContent = decodedContent.replace(/\s+/g, ' ');
  decodedContent = decodedContent.replace(/>\s+</g, '><');

  return decodedContent.trim();
};

/**
 * Extracts plain text from HTML content for previews
 */
const extractPlainText = (htmlContent) => {
  if (!htmlContent) return '';

  // First decode HTML entities
  let decodedContent = decodeHtmlEntities(htmlContent);

  // Remove HTML tags
  decodedContent = decodedContent.replace(/<[^>]*>/g, '');

  // Clean up whitespace
  decodedContent = decodedContent.replace(/\s+/g, ' ').trim();

  return decodedContent;
};

module.exports = {
  decodeHtmlEntities,
  formatEmailContent,
  extractPlainText
};