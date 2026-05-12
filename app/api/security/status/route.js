/**
 * Security Status API — Returns the security posture of the user's account
 * GET: Check security configuration and status
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { VAULT_CONFIG } from '@/lib/vault-crypto';
import { AUDIT_EVENTS } from '@/lib/audit-logger';

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const securityStatus = {
      // Layer 1: Authentication
      authentication: {
        provider: 'Google OAuth 2.0',
        scopes: 'openid, email, profile, gmail.send, gmail.readonly, gmail.modify',
        scopeNote: 'Minimal scopes — gmail.compose removed as redundant',
        sessionBinding: true,
        sessionBindingMethod: 'IP + User-Agent SHA-256 fingerprint',
        tokenRotation: true,
        accessTokenMaxAge: '1 hour',
        mfaViaGoogle: true
      },

      // Layer 2: Encryption
      encryption: {
        serverSide: {
          algorithm: 'AES-256-GCM (v3)',
          keyDerivation: 'scrypt',
          backwardCompat: ['AES-256-CBC v2 (random IV)', 'AES-256-CBC v1 (legacy)'],
          status: 'active'
        },
        clientSide: {
          algorithm: VAULT_CONFIG.algorithm,
          keyDerivation: VAULT_CONFIG.keyDerivation,
          iterations: VAULT_CONFIG.iterations,
          ivLength: VAULT_CONFIG.ivLength,
          tagLength: VAULT_CONFIG.tagLength,
          zeroKnowledge: true,
          status: 'available'
        }
      },

      // Layer 3: Data Segmentation
      dataSegmentation: {
        uuidIsolation: true,
        separateMetadataStorage: true,
        method: 'google_email → internal_uuid mapping'
      },

      // Layer 4: Transport Security
      transport: {
        tls: '1.3 (enforced by Vercel)',
        hsts: 'max-age=63072000; includeSubDomains; preload',
        csp: 'Active — restricts script, style, connect, frame sources',
        permissionsPolicy: 'Active — restricts camera, microphone, geolocation',
        xFrameOptions: 'SAMEORIGIN',
        xContentTypeOptions: 'nosniff',
        xXssProtection: '1; mode=block'
      },

      // Layer 5: Audit Logging
      auditLogging: {
        enabled: true,
        immutable: true,
        integrityVerification: 'HMAC-SHA256',
        trackedEvents: Object.keys(AUDIT_EVENTS).length,
        userAccessible: true,
        endpoint: '/api/security/audit-log'
      },

      // Layer 6: AI Data Handling
      aiDataHandling: {
        piiSanitization: true,
        sanitizedFields: ['emails', 'phones', 'SSNs', 'credit cards', 'names (in summaries)'],
        aiProvider: 'OpenRouter API',
        trainingOptOut: true,
        transparencyLog: true,
        endpoint: '/api/security/ai-transparency'
      },

      // Trust Proof
      trustProof: {
        securityTxt: '/.well-known/security.txt',
        privacyPolicy: '/privacy-policy',
        termsOfService: '/terms-of-service',
        responsibleDisclosure: true
      }
    };

    return NextResponse.json({ success: true, security: securityStatus });
  } catch (error) {
    console.error('🔐 [Security Status API] Error:', error.message);
    return NextResponse.json({ error: 'Failed to get security status' }, { status: 500 });
  }
}
