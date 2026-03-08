# AI Voice Cloning for Draft Replies

## Overview

Mailient now includes an AI voice cloning feature that analyzes users' previous outgoing emails to learn their unique writing style. When enabled, AI drafts (including regular draft replies, repair replies, and follow-ups) are generated in the user's own voice, making them indistinguishable from emails they would write themselves.

## How It Works

### 1. Voice Profile Analysis

When a user activates voice cloning, the system:

1. **Fetches sent emails**: Retrieves up to 30 of the user's most recent outgoing emails
2. **Analyzes writing patterns**: Uses AI to identify:
   - **Tone**: Primary style (formal/casual/professional), warmth level, assertiveness
   - **Greeting patterns**: Preferred greetings, whether they use recipient names
   - **Closing patterns**: Preferred sign-offs, signature style
   - **Language patterns**: Sentence length, vocabulary complexity, use of contractions/exclamations/emojis
   - **Structural patterns**: Email length, paragraph style, use of bullet points
   - **Personality traits**: Enthusiasm, detail-orientation, action-focus, relationship-building
   - **Sample phrases**: Characteristic expressions and phrases

3. **Stores the profile**: Saves the analyzed voice profile to the database for future use

### 2. Voice-Cloned Draft Generation

When generating drafts, the system:

1. Retrieves the user's voice profile from the database
2. If a profile exists, uses `OPENROUTER_API_KEY3` with a capable model for voice matching
3. Injects voice cloning instructions into the AI prompt
4. Generates a draft that matches the user's exact writing patterns

## API Endpoints

### Voice Profile Management

**Endpoint**: `POST /api/user/voice-profile`

Create or refresh the user's voice profile by analyzing their sent emails.

**Request Body**:
```json
{
    "forceRefresh": true  // Optional: force re-analysis even if profile is fresh
}
```

**Response**:
```json
{
    "message": "Voice profile created successfully",
    "voiceProfile": { ... },
    "refreshed": true,
    "emailsAnalyzed": 25
}
```

---

**Endpoint**: `GET /api/user/voice-profile`

Retrieve the user's current voice profile.

**Response**:
```json
{
    "exists": true,
    "needsRefresh": false,
    "voiceProfile": {
        "tone": { ... },
        "greeting_patterns": { ... },
        "closing_patterns": { ... },
        "language_patterns": { ... },
        "structural_patterns": { ... },
        "personality_traits": { ... },
        "sample_phrases": [ ... ],
        "status": "complete"
    },
    "analyzedAt": "2026-01-06T10:00:00.000Z",
    "emailCount": 25
}
```

---

**Endpoint**: `DELETE /api/user/voice-profile`

Delete the user's voice profile to revert to standard AI drafts.

**Response**:
```json
{
    "message": "Voice profile deleted. AI will now use default writing style.",
    "deleted": true
}
```

### Draft Reply Endpoints

All draft-related endpoints now automatically use voice cloning when a profile exists:

- `POST /api/email/draft-reply` - Standard draft replies
- `POST /api/email/repair-reply` - Relationship repair replies
- Follow-up generation (via `draft-reply` with follow-up category)

These endpoints now include `voiceCloned: true/false` in their responses to indicate whether voice cloning was used.

## Database Schema

### user_voice_profiles Table

```sql
CREATE TABLE user_voice_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    voice_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Run the migration in `supabase-voice-profile-migration.sql` to create this table.

## Configuration

### Environment Variables

The voice cloning feature uses `OPENROUTER_API_KEY3` for high-quality voice matching:

```env
OPENROUTER_API_KEY3=sk-or-v1-...
```

If not set, it falls back to `OPENROUTER_API_KEY`.

## Usage Limits

Voice cloning is available for both **Starter** and **Pro** plans:

- Uses the same rate limits as draft replies
- Counts against the `draft_reply` feature usage
- Pro users get unlimited voice-cloned drafts

## Implementation Details

### Files Modified/Created

1. **`lib/voice-profile-service.js`** (NEW)
   - `VoiceProfileService` class for analyzing and managing voice profiles
   - Methods: `fetchSentEmails`, `analyzeVoiceProfile`, `saveVoiceProfile`, `getVoiceProfile`, `generateVoicePrompt`

2. **`lib/openrouter-ai.js`** (MODIFIED)
   - Added `voiceCloningApiKey` and `voiceCloningModel` configuration
   - Updated `generateDraftReply` to accept voice profile in userContext
   - Updated `generateRepairReply` with voice cloning support
   - Updated `generateFollowUp` with voice cloning support
   - Added `generateVoicePrompt` method

3. **`app/api/user/voice-profile/route.js`** (NEW)
   - GET: Fetch voice profile
   - POST: Create/update voice profile
   - DELETE: Remove voice profile

4. **`app/api/email/draft-reply/route.js`** (MODIFIED)
   - Fetches voice profile before generating draft
   - Passes voice profile in userContext

5. **`app/api/email/repair-reply/route.js`** (MODIFIED)
   - Fetches voice profile before generating repair reply
   - Passes voice profile in userContext

6. **`lib/gmail.js`** (MODIFIED)
   - Added `setUserEmail` method for token persistence

7. **`supabase-voice-profile-migration.sql`** (NEW)
   - Database migration for voice profile storage

## Best Practices

1. **Minimum Emails**: Voice analysis requires at least 5 sent emails with substantial content
2. **Profile Refresh**: Profiles are automatically considered stale after 7 days
3. **Privacy**: Voice profiles are stored per-user and never shared
4. **Fallback**: If voice profile fetch fails, standard AI drafts are generated seamlessly

## Example Voice Profile

```json
{
    "tone": {
        "primary": "professional",
        "warmth_level": 7,
        "assertiveness": 6,
        "description": "Warm but businesslike, with a focus on clear communication"
    },
    "greeting_patterns": {
        "preferred_greetings": ["Hi", "Hey"],
        "uses_recipient_name": true,
        "greeting_warmth": "warm"
    },
    "closing_patterns": {
        "preferred_closings": ["Best", "Cheers"],
        "includes_name": true,
        "signature_style": "minimal"
    },
    "language_patterns": {
        "sentence_length": "short",
        "vocabulary_complexity": "moderate",
        "uses_contractions": true,
        "uses_exclamations": true,
        "uses_emojis": false,
        "common_phrases": ["Let me know", "Happy to help", "Looking forward"]
    },
    "structural_patterns": {
        "paragraph_length": "short",
        "uses_bullet_points": false,
        "typical_email_length": "brief",
        "structure_preference": "direct"
    },
    "personality_traits": {
        "enthusiastic": true,
        "detail_oriented": false,
        "action_focused": true,
        "relationship_building": true,
        "empathetic": true
    },
    "sample_phrases": [
        "Happy to help!",
        "Let me know if you need anything else",
        "Sounds great!",
        "Thanks for reaching out"
    ],
    "status": "complete",
    "email_count": 25,
    "analyzed_at": "2026-01-06T10:00:00.000Z"
}
```
