import { NextResponse } from "next/server";
import { ElevenLabsClient } from "elevenlabs";

export async function POST(request: Request) {
    try {
        const { text } = await request.json();

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
        // High-quality voice for article narration (Founder Hub Listen to Article)
        const VOICE_ID = "XrExE9yKIg1WjnnlVkGX";

        if (!ELEVENLABS_API_KEY) {
            console.warn("⚠️ ELEVENLABS_API_KEY is missing, TTS won't work");
            return NextResponse.json({ error: "Audio service not configured" }, { status: 404 });
        }

        const client = new ElevenLabsClient({
            apiKey: ELEVENLABS_API_KEY,
        });

        // Clean text from HTML tags for better TTS quality
        const cleanText = text.replace(/<[^>]*>?/gm, '').substring(0, 30000);

        console.log(`🎙️ ElevenLabs TTS: ${cleanText.length} chars, voice ${VOICE_ID}`);

        const audio = await client.generate({
            voice: VOICE_ID,
            text: cleanText,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
                stability: 0.4,
                similarity_boost: 0.95,
                style: 0.2,
                use_speaker_boost: true
            },
        });

        // Convert the stream to a buffer
        const chunks = [];
        for await (const chunk of audio) {
            chunks.push(chunk);
        }
        const audioBuffer = Buffer.concat(chunks);

        return new Response(audioBuffer, {
            headers: {
                "Content-Type": "audio/mpeg",
            },
        });
    } catch (error) {
        console.error("❌ Error in REAL ElevenLabs TTS route:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
