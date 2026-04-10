import crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const PREFIX = 'enc:v2:'; // New prefix for versioned encryption
const OLD_PREFIX = 'enc:';

function getKey() {
  const secret = process.env.ENCRYPTION_KEY || 'default-mailient-secure-key-2025';
  return crypto.scryptSync(secret, 'mailient-salt-v1', 32);
}

export function encrypt(text) {
  if (text === null || text === undefined) return text;
  if (typeof text !== 'string') text = String(text);
  if (text.startsWith(PREFIX)) return text;

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, getKey(), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Format: PREFIX + IV_HEX + : + ENCRYPTED_HEX
  return `${PREFIX}${iv.toString('hex')}:${encrypted}`;
}

export function decrypt(text) {
  if (!text || typeof text !== 'string') return text;
  
  if (text.startsWith(PREFIX)) {
    try {
      const parts = text.substring(PREFIX.length).split(':');
      if (parts.length !== 2) return text;
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      const decipher = crypto.createDecipheriv(algorithm, getKey(), iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Decryption v2 failed:', error.message);
      return text;
    }
  }

  if (text.startsWith(OLD_PREFIX)) {
    try {
      const fixedIv = Buffer.from('0123456789abcdef0123456789abcdef', 'hex');
      const encrypted = text.substring(OLD_PREFIX.length);
      const decipher = crypto.createDecipheriv(algorithm, getKey(), fixedIv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Decryption v1 failed:', error.message);
      return text;
    }
  }

  return text;
}
