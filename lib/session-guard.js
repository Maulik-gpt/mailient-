/**
 * Session Guard — Session Binding & Fingerprinting
 * Binds sessions to IP + User-Agent fingerprint.
 */
import crypto from 'crypto';

export function generateSessionFingerprint(request) {
  const ip = extractClientIP(request);
  const userAgent = extractUserAgent(request);
  const raw = `${ip}||${userAgent}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function extractClientIP(request) {
  if (request.headers) {
    const h = request.headers;
    const get = (k) => typeof h.get === 'function' ? h.get(k) : h[k];
    const vercelIp = get('x-vercel-forwarded-for');
    if (vercelIp) return vercelIp.split(',')[0].trim();
    const cfIp = get('cf-connecting-ip');
    if (cfIp) return cfIp.trim();
    const xff = get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();
    const realIp = get('x-real-ip');
    if (realIp) return realIp.trim();
  }
  return 'unknown';
}

export function extractUserAgent(request) {
  if (request.headers) {
    const ua = typeof request.headers.get === 'function'
      ? request.headers.get('user-agent')
      : request.headers['user-agent'];
    return ua || 'unknown';
  }
  return 'unknown';
}

export function validateSessionFingerprint(storedFingerprint, currentFingerprint) {
  if (!storedFingerprint) return { valid: true, reason: 'no_stored_fingerprint' };
  if (!currentFingerprint) return { valid: false, reason: 'no_current_fingerprint' };
  if (storedFingerprint === currentFingerprint) return { valid: true };
  return { valid: false, reason: 'fingerprint_mismatch' };
}

export function checkSessionSecurity(token, request) {
  if (token.accessTokenIssuedAt) {
    const tokenAge = Date.now() - token.accessTokenIssuedAt;
    if (tokenAge > 3600000) return { needsReauth: true, reason: 'token_expired' };
  }
  if (request) {
    const currentFp = generateSessionFingerprint(request);
    const validation = validateSessionFingerprint(token.sessionFingerprint, currentFp);
    if (!validation.valid) {
      console.warn(`🛡️ [SessionGuard] Fingerprint mismatch: ${token.email}. ${validation.reason}`);
      return { needsReauth: true, reason: validation.reason };
    }
  }
  return { needsReauth: false };
}

export function generateRotationId() {
  return `rot_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

export function createSessionMetadata(request) {
  return {
    sessionFingerprint: generateSessionFingerprint(request),
    accessTokenIssuedAt: Date.now(),
    rotationId: generateRotationId(),
    sessionCreatedAt: new Date().toISOString()
  };
}
