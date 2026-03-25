import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { OpenRouterAIService } from '@/lib/openrouter-ai';
import { subscriptionService, FEATURE_TYPES } from '@/lib/subscription-service';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email;
        const { fullContent, selectedText, instruction } = await request.json();

        if (!fullContent || !selectedText || !instruction) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check usage limits — return usage details so client can show upgrade modal
        const usageData = await subscriptionService.getFeatureUsage(userId, FEATURE_TYPES.DRAFT_REPLY);
        if (!usageData.hasAccess && !usageData.isUnlimited) {
            return NextResponse.json({
                error: 'limit_reached',
                usage: usageData.usage,
                limit: usageData.limit,
                period: usageData.period || 'daily',
                planType: usageData.planType || 'free'
            }, { status: 403 });
        }

        const aiService = new OpenRouterAIService();
        
        // System prompt that instructs the AI to ONLY return the refined version of the SELECTED text
        const systemPrompt = `You are an AI email assistant. 
Given an entire email draft and a specific PART of that email that the user has selected, your task is to rewrite ONLY the selected part based on the user's instruction.
Keep the tone consistent with the rest of the email.
Return ONLY the rewritten text for the selected part, nothing else. No conversational filler, explanations, or quotation marks around the output.`;

        const userPrompt = `FULL EMAIL DRAFT:
"""
${fullContent}
"""

SELECTED PART TO REWRITE:
"${selectedText}"

USER INSTRUCTION FOR THIS PART:
"${instruction}"

REWRITTEN VERSION:`;

        // Use callOpenRouter (the actual method) instead of non-existent generateCompletion
        const aiResponse = await aiService.callOpenRouter([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ], { maxTokens: 600, temperature: 0.4 });

        const refinedText = aiService.extractResponse(aiResponse)?.trim() || '';

        if (refinedText) {
            await subscriptionService.incrementFeatureUsage(userId, FEATURE_TYPES.DRAFT_REPLY);
        }

        return NextResponse.json({ refinedText });

    } catch (error) {
        console.error('Error in refine-reply:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

