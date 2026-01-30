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
            console.error("ELEVENLABS_API_KEY is missing");
            return NextResponse.json({ error: "Audio service not configured" }, { status: 500 });
        }

        // Clean text from HTML tags for better TTS quality
        const cleanText = text.replace(/<[^>]*>?/gm, '');

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
                    model_id: "eleven_monolingual_v1",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                        style: 0.0,
                        use_speaker_boost: true
                    },
                }),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            console.error("ElevenLabs API error:", error);
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
