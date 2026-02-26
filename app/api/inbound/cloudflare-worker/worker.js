/**
 * Cloudflare Worker for Mailient Inbound Email
 * 
 * This worker intercepts emails sent to *@mailient.xyz, parses them, 
 * and forwards the JSON payload to your Mailient API endpoint.
 * 
 * Deployment:
 * 1. Create a new Cloudflare Worker
 * 2. Paste this code
 * 3. Add env var `MAILIENT_API_URL` (e.g., https://mailient.xyz/api/inbound/webhook)
 * 4. Add env var `MAILIENT_API_KEY` (if you added auth to your endpoint)
 * 5. Go to Cloudflare Email Routing > Routes > Catch-All > Send to Worker
 */

import PostalMime from 'postal-mime';

export default {
    async email(message, env, ctx) {
        try {
            console.log(`Receiving email from ${message.from} to ${message.to}`);

            // Parse the raw email using postal-mime
            const rawEmail = await new Response(message.raw).arrayBuffer();
            const parser = new PostalMime();
            const parsedEmail = await parser.parse(rawEmail);

            // Construct a clean payload for your API
            const payload = {
                to: message.to,
                from: message.from,
                subject: parsedEmail.subject,
                text: parsedEmail.text,
                html: parsedEmail.html,
                messageId: parsedEmail.messageId,
                date: parsedEmail.date,
                headers: message.headers, // Includes forwarding headers
            };

            // Send to Mailient Backend
            const apiUrl = env.MAILIENT_API_URL || 'https://mailient.xyz/api/inbound/webhook';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': env.MAILIENT_API_KEY ? `Bearer ${env.MAILIENT_API_KEY}` : ''
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                console.error(`API rejected email configuration: ${response.status}`);
                const responseText = await response.text();
                console.error(`Error details: ${responseText}`);

                // Let the email service know it failed so it can bounce/retry
                message.setReject(`Failed to process via Mailient API: ${response.status}`);
            } else {
                console.log("Successfully forwarded to Mailient API");
            }
        } catch (error) {
            console.error('Error processing inbound email:', error);
            message.setReject('Internal server error processing email');
        }
    }
};
