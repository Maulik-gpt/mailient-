import crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
const iv = Buffer.from('0123456789abcdef0123456789abcdef', 'hex'); // Fixed IV for consistency

const PREFIX = 'enc:';

export function encrypt(text) {
  if (text === null || text === undefined) return text;
  if (typeof text !== 'string') text = String(text);
  if (text.startsWith(PREFIX)) return text; // Avoid double encryption

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${PREFIX}${encrypted}`;
}

export function decrypt(text) {
  if (!text || typeof text !== 'string' || !text.startsWith(PREFIX)) return text;

  try {
    const encrypted = text.substring(PREFIX.length);
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error.message);
    return text; // Fallback to raw text if decryption fails
  }
}
