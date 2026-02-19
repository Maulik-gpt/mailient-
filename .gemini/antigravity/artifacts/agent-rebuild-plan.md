# Agent Rebuild Plan — Notion AI-style Execution

## Current State Audit

### What WORKS (real infrastructure):
- ✅ Gmail Read: `read_gmail/route.js` — reads emails via Gmail API
- ✅ Gmail Send: `send-reply/route.js` — sends emails via Gmail API (session auth)
- ✅ Gmail Send: `send_email/route.js` — sends emails via Gmail API (header auth)
- ✅ Gmail Scopes: `gmail.readonly` + `gmail.send` ← both granted
- ✅ Draft Generation: `arcus-ai.js` → `generateDraftReply()` — generates drafts
- ✅ Notes Search: `notes-search/` — searches user notes
- ✅ Scheduling AI: `scheduling-ai.ts` → `recommendMeetingDetails()` — generates meeting JSON

### What DOESN'T work (the problems user reported):
- ❌ No Google Calendar API integration (no events, no invites, no availability check)
- ❌ No Cal.com integration
- ❌ AI hallucination — says it did things it didn't do
- ❌ AI forgets context mid-task — loses track of what it's doing
- ❌ Plan approval just generates text — doesn't execute real actions
- ❌ AI says "I can't send emails" — but the API CAN send (it's confused)
- ❌ No streaming/progressive UI — user waits for a black box

---

## The Rebuild

### Phase 1: Agent Steps UI (Notion AI-style)
**New component: `AgentSteps.tsx`**

Shows the agent's work in real-time as expandable/collapsible steps:

```
▸ Thinking...                         ← pulsing, expandable
  └─ "Looking for emails from John about the project proposal..."

▸ Planning                            ← expandable  
  └─ To-do list:
     ☐ Search for John's latest email
     ☐ Draft a reply
     ☐ Send the reply

▸ Working                             ← active step highlighted
  ☑ Search for John's latest email    ← crossed off
  ☐ Draft a reply                     ← currently running
  ☐ Send the reply

✓ Done                                ← collapsed, green check
```

Rules:
- Each step is expandable with a chevron arrow
- Completed steps auto-collapse after 2s
- Active step is always expanded
- Thinking phase shows AI's internal reasoning
- If AI has questions → asks before proceeding
- Steps fade out when fully complete (but don't disappear, user can re-expand)

### Phase 2: Agent Execution Backend
**Rewrite `chat-arcus/route.js` plan approval to use streaming-like multi-step execution**

The agent now:
1. **Thinks** — calls AI to understand the intent, identify gaps
2. **Clarifies** — if unclear, asks questions (blocks execution)
3. **Plans** — generates a to-do list of concrete steps
4. **Executes** — runs each step sequentially via real APIs:
   - `email_search` → calls read_gmail API
   - `email_read` → calls read_gmail with thread_id
   - `send_email` → calls send-reply API  
   - `create_draft` → generates draft, shows for user review
   - `create_meeting` → creates Google Calendar event (NEW)
   - `schedule_check` → checks Google Calendar availability (NEW)
5. **Reports** — returns structured result per step

### Phase 3: Google Calendar Integration (NEW)
**New file: `lib/google-calendar.ts`**

The app already has `gmail.send` scope. Need to add `calendar.events` scope.

Capabilities:
- Create calendar events with Google Meet links
- Check availability (free/busy)
- Send calendar invites to attendees

### Phase 4: Context Management (Fix "AI forgets")
- Pass full execution history as context to each AI call
- Maintain a "task state" object that tracks what's been done
- Each step gets the results of all previous steps

### Phase 5: Anti-Hallucination
- AI never claims it did something unless the API returned success
- Execution results are based on API responses, not AI text
- System prompt strictly forbids fabricating data

---

## File Changes

| File | Action |
|------|--------|
| `components/AgentSteps.tsx` | NEW — Notion AI-style step display |
| `app/api/agent-talk/chat-arcus/route.js` | REWRITE plan approval + add step execution |
| `lib/google-calendar.ts` | NEW — Google Calendar service |
| `lib/auth.js` | UPDATE — add calendar scope |
| `lib/arcus-ai.js` | UPDATE — fix context, anti-hallucination prompt |
| `app/dashboard/agent-talk/ChatInterface.tsx` | UPDATE — integrate AgentSteps UI |
| `app/dashboard/agent-talk/types/mission.ts` | UPDATE — add AgentStep types |
