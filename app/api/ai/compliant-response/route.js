import { NextResponse } from 'next/server';
import { AIPolicyCompliance } from '@/lib/ai-policy-compliance';

const compliance = new AIPolicyCompliance();

export async function POST(request) {
    try {
        const { emailData, type } = await request.json();

        // Check if we can process Google data with AI
        if (!compliance.canProcessGoogleData()) {
            // Return compliant response without AI processing
            const fallbackResponse = compliance.getFallbackResponse(emailData, type);
            return NextResponse.json({ 
                response: fallbackResponse,
                complianceMode: true,
                message: 'Google data protection enabled - using safe response generation'
            });
        }

        // If compliance mode is off, return error (should not happen in production)
        return NextResponse.json({
            error: 'Google data processing is disabled for compliance',
            complianceStatus: compliance.getComplianceStatus()
        }, { status: 403 });

    } catch (error) {
        console.error('Compliance endpoint error:', error);
        return NextResponse.json({ 
            error: 'Failed to process request',
            complianceStatus: compliance.getComplianceStatus()
        }, { status: 500 });
    }
}

export async function GET(request) {
    return NextResponse.json({
        complianceStatus: compliance.getComplianceStatus(),
        message: 'Google data policy compliance status'
    });
}
