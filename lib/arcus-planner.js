/**
 * Arcus Strategic Planner
 * 
 * Uses LLM to translate user intent into a structured sequence of tool calls.
 * The "Planner" in the Planner-Validator-Executor pattern.
 */

import { ARCUS_TOOLS } from './arcus-tool-registry.js';

export class ArcusPlanner {
    constructor(options = {}) {
        this.apiKey = process.env.OPENROUTER_API_KEY;
    }

    /**
     * Translates natural language into a multi-step action plan.
     */
    async plan(intent, context = {}) {
        console.log(`🤖 [Arcus Planner] Formulating plan for: "${intent}"`);

        const prompt = `You are the Arcus Strategic Planner for Mailient.
Your job is to translate a user's intent into a structured JSON execution plan using the provided tools.

** AVAILABLE TOOLS **
${JSON.stringify(ARCUS_TOOLS, null, 2)}

** USER CONTEXT **
${JSON.stringify(context, null, 2)}

** SCHEMA **
The output MUST be a JSON object with this exact structure:
{
    "human_readable_summary": "Short explanation of what will happen",
    "risk_analysis": "low" | "medium" | "high",
    "steps": [
        {
            "id": "step_id",
            "tool_id": "tool_id",
            "params": { ... },
            "explanation": "Why this step is necessary"
        }
    ],
    "estimated_duration_ms": 5000
}

** INTENT **
"${intent}"

Return ONLY the raw JSON.`;

        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://mailient.ai",
                    "X-Title": "Mailient Arcus AI"
                },
                body: JSON.stringify({
                    model: "google/gemini-2.0-flash-001",
                    messages: [{ role: "system", content: prompt }],
                    response_format: { type: "json_object" }
                })
            });

            const data = await response.json();
            const plan = JSON.parse(data.choices[0].message.content);
            
            console.log(`✅ [Arcus Planner] Plan created with ${plan.steps.length} steps.`);
            return plan;

        } catch (error) {
            console.error('💥 [Arcus Planner] Planning failed:', error);
            throw new Error(`Strategic planning failed: ${error.message}`);
        }
    }
}
