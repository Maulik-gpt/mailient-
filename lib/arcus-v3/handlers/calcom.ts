/**
 * Arcus V3 — Cal.com Action Handler
 * 
 * Executes cal.com actions: cancel_booking, reschedule_booking.
 * Uses API key authentication.
 */

/**
 * Cal.com Action Handler
 */
export async function calcomHandler(
  apiKey: string,
  action: string,
  params: any
): Promise<void> {
  const baseUrl = 'https://api.cal.com/v1';

  try {
    switch (action) {
      case 'cancel_booking':
        await cancelBooking(baseUrl, apiKey, params);
        return;
      case 'reschedule_booking':
        await rescheduleBooking(baseUrl, apiKey, params);
        return;
      default:
        throw new Error(`Unsupported Cal.com action: ${action}`);
    }
  } catch (err: any) {
    throw new Error(`Cal.com handler error (${action}): ${err.message}`);
  }
}

async function cancelBooking(baseUrl: string, apiKey: string, params: any) {
  const { bookingId, reason } = params;
  if (!bookingId) throw new Error('bookingId is required for cancel_booking');

  const response = await fetch(`${baseUrl}/bookings/${bookingId}/cancel?apiKey=${apiKey}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cal.com cancel failed: ${errorText}`);
  }

  return { success: true };
}

async function rescheduleBooking(baseUrl: string, apiKey: string, params: any) {
  const { bookingId, start, end, reason } = params;
  if (!bookingId) throw new Error('bookingId is required for reschedule_booking');

  const response = await fetch(`${baseUrl}/bookings/${bookingId}/reschedule?apiKey=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start, end, reason }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cal.com reschedule failed: ${errorText}`);
  }

  const data = await response.json();
  return { success: true, data };
}
