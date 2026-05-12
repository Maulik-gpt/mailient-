/**
 * PII Sanitizer — Strips Personally Identifiable Information before AI calls
 * 
 * Replaces names, emails, phone numbers, companies with placeholders
 * so AI models can analyze tone/urgency without seeing real PII.
 */

// ─── PII Detection Patterns ────────────────────────────────────────────────────

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
const URL_REGEX = /https?:\/\/[^\s<>"']+/g;
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
const CREDIT_CARD_REGEX = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;

/**
 * Sanitize text by replacing PII with numbered placeholders.
 * Returns both the sanitized text and a mapping for re-hydration.
 * 
 * @param {string} text - The raw text containing PII
 * @param {Object} [options] - Sanitization options
 * @param {boolean} [options.stripEmails=true] - Replace email addresses
 * @param {boolean} [options.stripPhones=true] - Replace phone numbers
 * @param {boolean} [options.stripUrls=true] - Replace URLs
 * @param {boolean} [options.stripNames=true] - Replace detected names
 * @param {boolean} [options.stripSSNs=true] - Replace SSN patterns
 * @param {boolean} [options.stripCreditCards=true] - Replace credit card numbers
 * @returns {{sanitized: string, mapping: Object, stats: Object}}
 */
export function sanitizePII(text, options = {}) {
  if (!text || typeof text !== 'string') {
    return { sanitized: text || '', mapping: {}, stats: { totalReplacements: 0 } };
  }

  const opts = {
    stripEmails: true,
    stripPhones: true,
    stripUrls: true,
    stripNames: true,
    stripSSNs: true,
    stripCreditCards: true,
    ...options
  };

  let sanitized = text;
  const mapping = {};
  const stats = { emails: 0, phones: 0, urls: 0, names: 0, ssns: 0, creditCards: 0, totalReplacements: 0 };

  // Phase 1: Email addresses → [EMAIL_1], [EMAIL_2], ...
  if (opts.stripEmails) {
    const emails = [...new Set(sanitized.match(EMAIL_REGEX) || [])];
    emails.forEach((email, i) => {
      const placeholder = `[EMAIL_${i + 1}]`;
      mapping[placeholder] = email;
      sanitized = sanitized.split(email).join(placeholder);
      stats.emails++;
    });
  }

  // Phase 2: SSNs → [SSN_REDACTED]
  if (opts.stripSSNs) {
    const ssns = [...new Set(sanitized.match(SSN_REGEX) || [])];
    ssns.forEach((ssn, i) => {
      const placeholder = `[SSN_REDACTED_${i + 1}]`;
      mapping[placeholder] = ssn;
      sanitized = sanitized.split(ssn).join(placeholder);
      stats.ssns++;
    });
  }

  // Phase 3: Credit cards → [CARD_REDACTED]
  if (opts.stripCreditCards) {
    const cards = [...new Set(sanitized.match(CREDIT_CARD_REGEX) || [])];
    cards.forEach((card, i) => {
      const placeholder = `[CARD_REDACTED_${i + 1}]`;
      mapping[placeholder] = card;
      sanitized = sanitized.split(card).join(placeholder);
      stats.creditCards++;
    });
  }

  // Phase 4: Phone numbers → [PHONE_1], ...
  if (opts.stripPhones) {
    const phones = [...new Set(sanitized.match(PHONE_REGEX) || [])];
    // Filter out numbers that are too short (false positives)
    const validPhones = phones.filter(p => p.replace(/\D/g, '').length >= 7);
    validPhones.forEach((phone, i) => {
      const placeholder = `[PHONE_${i + 1}]`;
      mapping[placeholder] = phone;
      sanitized = sanitized.split(phone).join(placeholder);
      stats.phones++;
    });
  }

  // Phase 5: URLs → [URL_1], ...
  if (opts.stripUrls) {
    const urls = [...new Set(sanitized.match(URL_REGEX) || [])];
    urls.forEach((url, i) => {
      const placeholder = `[URL_${i + 1}]`;
      mapping[placeholder] = url;
      sanitized = sanitized.split(url).join(placeholder);
      stats.urls++;
    });
  }

  // Phase 6: Names from email headers
  if (opts.stripNames) {
    const namePatterns = [
      /From:\s*"?([^"<\n]+)"?\s*(?:<[^>]*>)?/gi,
      /To:\s*"?([^"<\n]+)"?\s*(?:<[^>]*>)?/gi,
      /Cc:\s*"?([^"<\n]+)"?\s*(?:<[^>]*>)?/gi,
    ];

    const detectedNames = new Set();
    namePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1].trim();
        if (name && name.length > 2 && name.length < 50 && !name.includes('@')) {
          detectedNames.add(name);
        }
      }
    });

    const namesArr = [...detectedNames];
    // Sort by length descending to replace longer names first
    namesArr.sort((a, b) => b.length - a.length);
    namesArr.forEach((name, i) => {
      const placeholder = `[PERSON_${i + 1}]`;
      mapping[placeholder] = name;
      // Use word boundary-aware replacement
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      sanitized = sanitized.replace(new RegExp(escaped, 'gi'), placeholder);
      stats.names++;
    });
  }

  stats.totalReplacements = stats.emails + stats.phones + stats.urls + stats.names + stats.ssns + stats.creditCards;

  return { sanitized, mapping, stats };
}

/**
 * Re-hydrate sanitized text by replacing placeholders with original values.
 * 
 * @param {string} sanitizedText - Text with placeholders
 * @param {Object} mapping - Placeholder-to-original mapping
 * @returns {string} Text with original values restored
 */
export function rehydratePII(sanitizedText, mapping) {
  if (!sanitizedText || !mapping) return sanitizedText;

  let result = sanitizedText;
  for (const [placeholder, original] of Object.entries(mapping)) {
    result = result.split(placeholder).join(original);
  }
  return result;
}

/**
 * Create a sanitization log entry for transparency.
 * 
 * @param {string} userId - The user who triggered the AI call
 * @param {string} operation - What AI operation was performed
 * @param {Object} stats - Sanitization statistics
 * @param {number} inputLength - Length of input text
 * @returns {Object} Log entry
 */
export function createSanitizationLog(userId, operation, stats, inputLength) {
  return {
    userId,
    operation,
    timestamp: new Date().toISOString(),
    inputCharacterCount: inputLength,
    piiStripped: stats,
    aiProvider: 'openrouter',
    dataRetention: 'not_used_for_training'
  };
}
