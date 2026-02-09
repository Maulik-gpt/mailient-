const crypto = require('crypto');

function validatePolarWebhook(payload, headers, secret) {
    try {
        const webhookId = headers['webhook-id'];
        const webhookTimestamp = headers['webhook-timestamp'];
        const webhookSignature = headers['webhook-signature'];

        if (!webhookId || !webhookTimestamp || !webhookSignature) {
            return { valid: false, reason: 'missing headers' };
        }

        let key = secret.trim();
        if (key.startsWith('polar_whs_')) {
            key = key.slice('polar_whs_'.length);
        } else if (key.startsWith('whsec_')) {
            key = key.slice('whsec_'.length);
        }

        const keyBytes = Buffer.from(key, 'base64');
        const toSign = `${webhookId}.${webhookTimestamp}.${payload}`;
        const hmac = crypto.createHmac('sha256', keyBytes);
        hmac.update(toSign);
        const expected = hmac.digest('base64');

        const candidates = webhookSignature.split(' ').map(s => s.trim()).filter(Boolean);
        for (const candidate of candidates) {
            const [version, sig] = candidate.split(',', 2);
            if (version !== 'v1' || !sig) continue;
            if (sig === expected) return { valid: true };
        }

        return { valid: false, reason: 'signature mismatch', expected };
    } catch (error) {
        return { valid: false, reason: 'error', error: error.message };
    }
}

// Test data
const secret = 'polar_whs_IxIyuuxTzhvnN6goyWdveAeOR2HxL1ci1Y2uC0o2RZC';
const payload = '{"type":"subscription.created","data":{"id":"sub_123"}}';
const headers = {
    'webhook-id': 'msg_123',
    'webhook-timestamp': '1739080000',
    'webhook-signature': 'v1,incorrect_signature'
};

console.log(validatePolarWebhook(payload, headers, secret));
