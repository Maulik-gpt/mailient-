/**
 * Polar invoice fetcher.
 *
 * Polar generates an invoice per ORDER (a real charge), not per subscription, and
 * only on demand. Two-step API (verified against Polar docs):
 *   POST /v1/orders/{id}/invoice  → 202, schedules generation (a few seconds)
 *   GET  /v1/orders/{id}/invoice  → returns the invoice incl. the hosted PDF url
 *                                   (404 until generation finishes)
 *
 * Auth: the Organization Access Token (POLAR_ACCESS_TOKEN). Returns the PDF url or
 * null — always best-effort, never throws (the receipt email still goes out).
 */

const POLAR_API = 'https://api.polar.sh/v1';

export async function getPolarInvoiceUrl(orderId, { retries = 3, delayMs = 2000 } = {}) {
  const token = process.env.POLAR_ACCESS_TOKEN || process.env.POLAR_API_KEY;
  if (!token || !orderId) return null;

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 1. Trigger generation. 202 = scheduled; 409/conflict = already generated — both fine.
  try {
    await fetch(`${POLAR_API}/orders/${orderId}/invoice`, { method: 'POST', headers, signal: AbortSignal.timeout(8000) });
  } catch { /* generation may already exist or be in flight — fall through to GET */ }

  // 2. Poll GET until the PDF url appears (or we give up — email goes without it).
  for (let i = 0; i < retries; i++) {
    await new Promise((r) => setTimeout(r, delayMs));
    try {
      const res = await fetch(`${POLAR_API}/orders/${orderId}/invoice`, { headers, signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const inv = await res.json().catch(() => ({}));
        const url = inv.url || inv.invoice_url || inv.pdf_url || inv.hosted_invoice_url || null;
        if (url) return url;
      }
      // 404 = not ready yet; keep polling.
    } catch { /* transient — keep polling */ }
  }
  return null;
}

/** Format a Polar minor-unit amount (e.g. cents) into a display string like "$29.00". */
export function formatPolarAmount(amountMinor, currency = 'USD') {
  if (amountMinor == null || isNaN(Number(amountMinor))) return null;
  const major = Number(amountMinor) / 100;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency || 'USD').toUpperCase() }).format(major);
  } catch {
    return `${major.toFixed(2)} ${(currency || 'USD').toUpperCase()}`;
  }
}
