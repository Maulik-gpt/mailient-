import { NextResponse } from 'next/server';
// @ts-ignore
import { auth } from '@/lib/auth';
import { AIConfig } from '@/lib/ai-config';

/**
 * POST /api/onboarding/generate-agent
 * Generates a structured agent plan from a user's natural-language prompt.
 * Used during onboarding Step 5 (Create First Agent).
 */
export async function POST(request: Request) {
  try {
    // @ts-ignore
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, goals } = await request.json();

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Try AI generation first
    try {
      const aiService = new AIConfig();
      if (aiService.hasAIConfigured()) {
        const systemPrompt = `You are an AI agent planner for Mailient, an email automation platform.
The user wants to create an AI agent. Based on their description, generate a structured agent plan.

Return ONLY valid JSON with this exact structure:
{
  "goal": "A clear one-line goal description",
  "tools": ["list", "of", "tools", "needed"],
  "actions": ["list", "of", "actions", "the", "agent", "will", "take"],
  "permissions": ["list", "of", "permissions", "required"],
  "schedule": "How often the agent runs (e.g., 'Every morning at 9 AM', 'Real-time', 'Hourly')"
}

Available tools: Gmail, Google Calendar, Notion, Slack, Google Meet
Available permissions: Read emails, Send emails, Draft replies, Manage labels, Read calendar, Create events, Read Notion, Write Notion, Send Slack messages

User's selected goals: ${(goals || []).join(', ')}
User's agent description: ${prompt}`;

        const response = await aiService.generateChatResponse(
          systemPrompt,
          prompt,
          false,
          { timeout: 12000 }
        );

        // Try to parse the AI response as JSON
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const plan = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ success: true, plan });
        }
      }
    } catch (aiError) {
      console.warn('⚠️ [Onboarding] AI agent generation failed, using synthetic fallback:', aiError);
    }

    // Synthetic fallback — always works
    const goalMap: Record<string, any> = {
      'scheduling': {
        goal: 'Automatically schedule meetings from incoming email requests',
        tools: ['Gmail', 'Google Calendar'],
        actions: ['Monitor inbox for meeting requests', 'Check calendar availability', 'Propose time slots', 'Create calendar events', 'Send confirmation emails'],
        permissions: ['Read emails', 'Read calendar', 'Create events', 'Draft replies', 'Send emails'],
        schedule: 'Real-time',
      },
      'inbox': {
        goal: 'Triage and organize incoming emails automatically',
        tools: ['Gmail'],
        actions: ['Categorize incoming emails', 'Label by priority', 'Archive low-priority emails', 'Flag urgent messages', 'Generate daily inbox summary'],
        permissions: ['Read emails', 'Manage labels', 'Draft replies'],
        schedule: 'Every 15 minutes',
      },
      'followups': {
        goal: 'Track and send follow-up reminders for unanswered emails',
        tools: ['Gmail', 'Google Calendar'],
        actions: ['Track sent emails awaiting replies', 'Send follow-up reminders', 'Draft follow-up messages', 'Log follow-up tasks'],
        permissions: ['Read emails', 'Draft replies', 'Send emails', 'Create events'],
        schedule: 'Daily at 9 AM',
      },
      'briefings': {
        goal: 'Generate executive briefings from email and calendar data',
        tools: ['Gmail', 'Google Calendar', 'Notion'],
        actions: ['Scan inbox for key communications', 'Summarize calendar for the day', 'Compile executive briefing', 'Post briefing to Notion'],
        permissions: ['Read emails', 'Read calendar', 'Write Notion'],
        schedule: 'Every morning at 8 AM',
      },
      'custom': {
        goal: prompt.slice(0, 120),
        tools: ['Gmail', 'Google Calendar'],
        actions: ['Process incoming emails', 'Execute custom workflow', 'Send notifications', 'Log activity'],
        permissions: ['Read emails', 'Draft replies', 'Send emails'],
        schedule: 'Real-time',
      },
    };

    // Pick the best matching goal or use custom
    const firstGoal = (goals || ['custom'])[0]?.toLowerCase() || 'custom';
    const plan = goalMap[firstGoal] || goalMap['custom'];

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error('❌ [Onboarding] Error generating agent:', error);
    return NextResponse.json(
      { error: 'Failed to generate agent plan' },
      { status: 500 }
    );
  }
}
