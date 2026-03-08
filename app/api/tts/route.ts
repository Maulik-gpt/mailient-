import { NextResponse } from "next/server";
import { ElevenLabsClient } from "elevenlabs";

// Free-tier friendly: eleven_turbo_v2_5 uses 0.5 credits/char; 10k chars = 5k credits
const MAX_CHARS = 10000;
const VOICE_ID = "XrExE9yKIg1WjnnlVkGX";
const FALLBACK_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel - default voice, works on free tier

async function generateWithVoice(
    client: InstanceType<typeof ElevenLabsClient>,
    voiceId: string,
    cleanText: string
): Promise<Buffer> {
    const audio = await client.generate({
        voice: voiceId,
        text: cleanText,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
            stability: 0.5,
            similarity_boost: 0.9,
            use_speaker_boost: true,
        },
    });
    const chunks: Buffer[] = [];
    for await (const chunk of audio) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}

export async function POST(request: Request) {
    try {
        const { text } = await request.json();

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

        if (!ELEVENLABS_API_KEY) {
            console.warn("⚠️ ELEVENLABS_API_KEY is missing, TTS won't work");
            return NextResponse.json(
                { error: "Audio service not configured", code: "NO_API_KEY" },
                { status: 503 }
            );
        }

        const client = new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY });

        const cleanText = text.replace(/<[^>]*>?/gm, "").trim().substring(0, MAX_CHARS);

        if (!cleanText) {
            return NextResponse.json({ error: "No text to speak after cleaning" }, { status: 400 });
        }

        console.log(`🎙️ ElevenLabs TTS: ${cleanText.length} chars, voice ${VOICE_ID}`);

        let audioBuffer: Buffer;
        try {
            audioBuffer = await generateWithVoice(client, VOICE_ID, cleanText);
        } catch (firstErr: unknown) {
            const code = firstErr && typeof firstErr === "object" && "statusCode" in firstErr ? (firstErr as { statusCode?: number }).statusCode : undefined;
            const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
            if (code === 404 || (msg && msg.toLowerCase().includes("voice"))) {
                console.warn("⚠️ Primary voice not found, using fallback voice Rachel");
                audioBuffer = await generateWithVoice(client, FALLBACK_VOICE_ID, cleanText);
            } else {
                throw firstErr;
            }
        }

        return new Response(audioBuffer, {
            headers: { "Content-Type": "audio/mpeg" },
        });
    } catch (err: unknown) {
        const statusCode = err && typeof err === "object" && "statusCode" in err ? (err as { statusCode?: number }).statusCode : undefined;
        const body = err && typeof err === "object" && "body" in err ? (err as { body?: unknown }).body : undefined;
        const message = err instanceof Error ? err.message : String(err);
        console.error("❌ ElevenLabs TTS error:", { message, statusCode, body });

        if (statusCode === 401) {
            return NextResponse.json({ error: "Invalid API key", code: "AUTH_ERROR" }, { status: 503 });
        }
        if (statusCode === 402 || (message && message.toLowerCase().includes("quota"))) {
            return NextResponse.json({ error: "Out of credits or quota", code: "QUOTA" }, { status: 503 });
        }
        if (statusCode === 404 || (message && message.toLowerCase().includes("voice"))) {
            return NextResponse.json({ error: "Voice or model not found", code: "NOT_FOUND" }, { status: 503 });
        }

        return NextResponse.json(
            { error: "Audio generation failed", code: "TTS_ERROR" },
            { status: 500 }
        );
    }
}
