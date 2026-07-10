import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { OpenRouterAIService } from '@/lib/openrouter-ai';
import { subscriptionService, FEATURE_TYPES } from '@/lib/subscription-service';
import { logEvent } from "@/lib/logsso";

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email;
        const { fullContent, selectedText, instruction, originalContext } = await request.json();

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
Given an entire email draft, the original email you are replying to, and a specific PART of that draft that the user has selected, your task is to rewrite ONLY the selected part based on the user's instruction.
Keep the tone consistent with the rest of the email.

CRITICAL OUTPUT RULES:
- You must FIRST write your entire reasoning process and thoughts inside <think> and </think> tags. Do not skip this step!
- Then, output ONLY the rewritten text for the selected part inside <email> and </email> tags.
- The text inside <email> tags MUST be a direct replacement for the selected text. Do not add introductory conversational filler.
- Example: 
<think>The user wants me to add the link from the original email...</think>
<email>the rewritten text goes here</email>`;

        const userPrompt = `ORIGINAL EMAIL BEING REPLIED TO:
"""
${originalContext || 'No context provided.'}
"""

FULL EMAIL DRAFT:
"""
${fullContent}
"""

SELECTED PART TO REWRITE:
"${selectedText}"

USER INSTRUCTION FOR THIS PART:
"${instruction}"

REWRITTEN VERSION (Remember to put thoughts in <think> tags, and final output in <email> tags):`;

        const aiResponse = await aiService.callOpenRouter([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ], { maxTokens: 1200, temperature: 0.4 });

        // Use extractEmailDraft to strip any thinking/reasoning
        const rawText = aiService.extractResponse(aiResponse) || '';
        const refinedText = aiService.extractEmailDraft(rawText)?.trim() || '';

        if (refinedText) {
            await subscriptionService.incrementFeatureUsage(userId, FEATURE_TYPES.DRAFT_REPLY);
        }

        return NextResponse.json({ refinedText });

    } catch (error) {
    logEvent({ channel: "failures", event: "❌ API Error", description: String(error) });
        console.error('Error in refine-reply:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

