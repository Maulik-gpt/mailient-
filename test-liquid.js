import { OpenRouterAIService } from './lib/openrouter-ai.js';
import { AIConfig } from './lib/ai-config.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
    console.log("Testing stream with liquid...");
    const ai = new AIConfig();
    try {
        const stream = await ai.getService().generateDraftReplyStream(
            "From: Bob\nSubject: Hello\nBody: Just saying hi",
            "general",
            { name: "Alice" }
        );
        console.log("Stream received!");
    } catch (e) {
        console.error("Stream failed:", e);
    }
}
test();
