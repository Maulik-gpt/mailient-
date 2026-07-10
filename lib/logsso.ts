/**
 * logs.so event tracking wrapper
 * Fire-and-forget, non-blocking, never throws.
 */

interface LogEventOptions {
  channel: string;
  event: string;
  description: string;
  user_id?: string;
  tags?: Record<string, any>;
}

export function logEvent(options: LogEventOptions): void {
  try {
    const apiKey = process.env.LOGS_SO_API_KEY;
    if (!apiKey) {
      return; // No-op if key is unset
    }

    // Fire and forget, don't await
    fetch('https://api.logs.so/v2/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey
      },
      body: JSON.stringify({
        project: 'cmrf3u6jx0014mz1jnldbmteb',
        channel: options.channel,
        event: options.event,
        description: options.description,
        user_id: options.user_id,
        tags: options.tags
      })
    }).catch(() => {
      // Never throw or block on logging failure
    });
  } catch (error) {
    // Fail silently
  }
}
