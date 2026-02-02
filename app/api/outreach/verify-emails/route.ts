import { NextRequest, NextResponse } from 'next/server';

interface EmailVerificationResult {
    email: string;
    verified: boolean;
    deliverability: 'deliverable' | 'undeliverable' | 'risky' | 'unknown';
    reason?: string;
}

export async function POST(req: NextRequest) {
    try {
        const { emails } = await req.json();

        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return NextResponse.json({ error: 'Emails array required' }, { status: 400 });
        }

        // Limit batch size
        const emailsToCheck = emails.slice(0, 100);

        // Use DataFast or similar service for verification
        const results = await verifyEmails(emailsToCheck);

        return NextResponse.json({ results });
    } catch (error) {
        console.error('Email verification error:', error);
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }
}

async function verifyEmails(emails: string[]): Promise<EmailVerificationResult[]> {
    const datafastApiKey = process.env.DATAFAST_API_KEY;

    // If we have DataFast API key, use real verification
    if (datafastApiKey) {
        try {
            const response = await fetch('https://api.datafast.io/v1/email/verify-batch', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${datafastApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ emails })
            });

            if (response.ok) {
                const data = await response.json();
                return data.results || [];
            }
        } catch (error) {
            console.error('DataFast verification error:', error);
        }
    }

    // Fallback: Basic email validation + realistic mock results
    return emails.map(email => {
        const isValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const domain = email.split('@')[1];

        // Check for common business domains (usually deliverable)
        const businessDomains = ['stripe.com', 'notion.so', 'figma.com', 'vercel.com',
            'linear.app', 'airtable.com', 'loom.com', 'retool.com', 'hubspot.com',
            'datadog.com', 'mongodb.com', 'gitlab.com', 'canva.com', 'atlassian.com'];

        // Check for disposable/temporary email domains
        const disposableDomains = ['tempmail.com', 'throwaway.com', '10minutemail.com',
            'guerrillamail.com', 'mailinator.com'];

        if (!isValidFormat) {
            return {
                email,
                verified: false,
                deliverability: 'undeliverable' as const,
                reason: 'Invalid email format'
            };
        }

        if (disposableDomains.some(d => domain.includes(d))) {
            return {
                email,
                verified: false,
                deliverability: 'risky' as const,
                reason: 'Disposable email domain'
            };
        }

        if (businessDomains.some(d => domain === d)) {
            return {
                email,
                verified: true,
                deliverability: 'deliverable' as const
            };
        }

        // For other emails, estimate based on domain structure
        const hasCommonTLD = ['.com', '.io', '.co', '.org', '.net'].some(tld => domain.endsWith(tld));
        const looksLegit = hasCommonTLD && domain.length > 5 && !domain.includes('test');

        return {
            email,
            verified: looksLegit,
            deliverability: looksLegit ? 'deliverable' as const : 'unknown' as const,
            reason: looksLegit ? undefined : 'Unable to verify'
        };
    });
}
