import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { text } = await request.json();

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
        const VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam - Deep, smoothing male voice

        if (!ELEVENLABS_API_KEY) {
            console.warn("⚠️ ELEVENLABS_API_KEY is missing, TTS won't work");
            return NextResponse.json({ error: "Audio service not configured" }, { status: 404 });
        }

        // Clean text from HTML tags for better TTS quality
        const cleanText = text.replace(/<[^>]*>?/gm, '').substring(0, 5000);

        console.log(`🎙️ Generating TTS for ${cleanText.length} chars...`);

        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "xi-api-key": ELEVENLABS_API_KEY,
                },
                body: JSON.stringify({
                    text: cleanText,
                    model_id: "eleven_multilingual_v2",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.8,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ ElevenLabs API error:", errorText);
            return NextResponse.json({ error: "Failed to generate audio" }, { status: response.status });
        }

        const audioBuffer = await response.arrayBuffer();

        return new Response(audioBuffer, {
            headers: {
                "Content-Type": "audio/mpeg",
            },
        });
    } catch (error) {
        console.error("Error in TTS route:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
