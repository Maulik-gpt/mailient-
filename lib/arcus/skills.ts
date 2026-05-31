export type SlashCategory = 'workflows' | 'profile' | 'navigation';

export interface SlashCommand {
  name: string;
  description: string;
  category: SlashCategory;
  icon: string;
  kind: 'prompt' | 'client';
  template?: string;
  clientHandler?:
    | 'openAgents'
    | 'openMemorySettings'
    | 'openSettings'
    | 'clearConversation'
    | 'showHelp';
}

const GROUND_RULES = `

═══════════════════════════════════════════════════════
GROUND RULES — apply strictly, no exceptions:
• Fetch before claim. Every reference to real data (email, calendar slot, contact, Notion page, Slack thread) MUST come from a tool call THIS turn. Never invent senders, subjects, dates, names, numbers, or counts.
• Integration awareness. If a required integration is not connected, SKIP that step cleanly and report "<X> not connected — skipped" inline. Never fabricate output from a missing integration.
• Empty results are valid. If a search returns nothing, say so plainly. Never pad with imagined items.
• One pass per source. Don't re-search the same source with slight query variants to fill an empty section.
• Stay on lane. Execute exactly the workflow below; don't pivot to unrelated work just because you found capacity.
• Output structure is mandatory. The format named below is required — the user's UI expects it; deviation breaks rendering.`;

const BRIEF = `
COMMAND: /brief — Morning briefing across all 5 VAs (Inbox, Calendar, CRM, Comms, Research).

INTERPRET USER ARGS FIRST (override default scope when present):
  • Args name a domain ("just inbox", "calendar only", "client work only") → restrict to that domain's fetch only, skip the rest.
  • Args name a person / company → bias every fetch toward that entity (gmail_unlimited_search for them, memory queries about them, Notion search for them). Drop everything unrelated.
  • Args ask a specific question ("any meetings tomorrow?", "did the SOW get signed?") → answer the question directly using minimum tools; skip the full briefing canvas.
  • Args narrow time ("just morning", "today only") → adjust the window in your fetches.
  • Args absent → run the FULL default workflow below.

DEFAULT WORKFLOW (only when args are absent or general):

PHASE 1 — Parallel context fetch (emit ALL of these tool calls in your first turn, IN PARALLEL):
  a) gmail_unlimited_search({ query: "is:unread newer_than:1d -category:promotions", maxResults: 50 })
  b) calendar_unlimited_scan({ daysAhead: 2, includeNotionCalendar: true })
  c) search_notion({ query: "active project deal client", maxResults: 8 })
  d) memory_unlimited_scan({ queries: ["recent client signals", "urgent deadlines", "stalled deals"], perQueryLimit: 5 })
  e) check_followups({ daysBack: 7 })

PHASE 2 — Triage what came back:
  • Run gmail_detect_urgency on the top 10 unread thread ids returned by (a).
  • If any thread scored ≥8, mark it for the "Needs Your Attention" section.
  • Cross-reference: any unread sender that appears in Notion (from c) is high-signal — bump it to top.
  • Run surface_proactive_signals over the combined context to catch DEADLINE / STALLED_DEAL / VIP_WAITING / OPPORTUNITY items.

PHASE 3 — Synthesize and deliver:
  Open Canvas with title "Morning Briefing — <today's date in 'Mon Day' format>", type "report". Markdown skeleton:

  # Morning Briefing — <date>

  ## ⚡ Top of mind
  <2-4 bullets — the most important things from any source, in priority order. Each bullet names the source + action needed in plain English.>

  ## 📧 Inbox (last 24h)
  <count of unread, then 3-5 highest-urgency threads. For each: sender · subject · 1-line summary · urgency-score chip. Newsletters: just count, never list.>

  ## 📅 Calendar (today + tomorrow)
  <chronological list. For each: time · title · attendees count · meet-link present?>

  ## 📝 Notion (recent activity)
  <up to 5 recent pages touched. For each: title · last-edited · link>

  ## ⚠️ Needs your attention
  <only if anything from surface_proactive_signals fired OR any thread urgency ≥8. One bullet per item, with evidence link.>

  Chat reply (after Canvas opens): one warm sentence — "Briefing's up. The big one this morning is <top item in one phrase>."

EDGE CASES:
  • Zero unread emails: Inbox section says "Inbox clear — nothing from the last 24h."
  • No upcoming meetings: Calendar section says "Calendar's free for the next 2 days."
  • Integration missing: skip that section entirely (don't print empty headers).` + GROUND_RULES;

const INBOX = `
COMMAND: /inbox — Full inbox triage: digest newsletters, flag VIPs, draft replies, surface decisions.

INTERPRET USER ARGS FIRST (this overrides default phases below):
  • If args ask about urgency ("what is urgent", "urgent only", "priorities", "what needs me today"):
      Run gmail_unlimited_search({ query: "is:unread newer_than:2d -category:promotions", maxResults: 50 })
      → gmail_detect_urgency on top 20 → return ONLY urgent items (score ≥7), sorted desc. SKIP newsletter pass, SKIP batch drafting, SKIP archival. Output: ranked list of urgent threads with sender · subject · urgency reason · link. Stop after that.
  • If args name a specific sender / company / domain:
      gmail_unlimited_search({ query: "from:<that sender> newer_than:14d", maxResults: 25 })
      → summarize the thread history with that sender → propose ONE action (draft / archive / no-action). SKIP all other phases.
  • If args ask about a specific topic / project / keyword:
      gmail_unlimited_search({ query: "<keyword> newer_than:14d", maxResults: 25 })
      → group by sender → propose actions. SKIP all other phases.
  • If args explicitly say "digest newsletters" / "clean newsletters" / "promotional":
      Run only Phase 3 (newsletter pass), skip 1+2+4.
  • If args are absent OR are a general "triage" / "handle the inbox" / "clean it up":
      Run the FULL default workflow below (Phases 1-5).

DEFAULT WORKFLOW (only when args are absent or general):

PHASE 1 — Pull the worklist (parallel):
  a) build_worklist({ agentName: "Inbox triage", gmailQuery: "is:unread newer_than:2d -category:promotions", maxResults: 60, clientDomains: [] })
  b) gmail_unlimited_search({ query: "category:promotions OR (from:newsletter OR from:digest) newer_than:7d", maxResults: 100 })

PHASE 2 — Tier the work (the worklist is already tiered; use it):
  • Tier 1 (Client threads, 3+ exchanges in 90d) → draft replies. Use gmail_batch_draft_replies if ≥3 items, draft_reply for 1-2.
  • Tier 2 (Revenue signals — contracts, invoices, proposals, pricing, renewals) → ALWAYS draft replies, mark for "Needs your attention."
  • Tier 3 (Scheduling requests) → check calendar_get_availability for the proposed window, then draft a reply with 2-3 concrete time options.
  • Tier 4 (Everything else) → batch-archive if it's been read by anyone in the org, else leave untouched.

PHASE 3 — Newsletter pass (from b):
  Run digest_newsletters over the newsletter result set (do NOT auto-archive; user must opt in). Produce ONE digest summary.

PHASE 4 — Quality + record:
  • Run check_draft_quality on every draft produced. If shouldRedraft=true, regenerate without flagged phrases.
  • record_processed_items({ agentName: "Inbox triage", itemIds: [...all thread ids touched] }) so the next run doesn't redo this work.

PHASE 5 — Compose the report (chat reply, not Canvas — fits in 3-5 sentences):

  Drafted <N> replies, archived <M> newsletters, flagged <K> for your attention.

  **🔴 Needs your decision:**
  - <item 1 — recipient, subject, one-line about the ask, link to draft>
  - <item 2 ...>

  **📨 Drafts ready in Gmail:**
  - <recipient · subject · link to draft>
  - ...

  **📰 Newsletter digest:** "<one-line summary of the digest>. Want me to archive these?"

EDGE CASES:
  • Gmail not connected: stop immediately with "Gmail isn't connected. Click connectors → Gmail."
  • Zero unread + zero newsletters: "Inbox is clear — nothing to triage right now."
  • Voice profile missing: still draft, but flag "(voice profile not built — drafts use a default tone. Run /voice to build one.)"` + GROUND_RULES;

const FOLLOW_UP = `
COMMAND: /follow-up — Find threads where the user is waiting on a reply. Draft polite nudges.

INTERPRET USER ARGS FIRST (override default scope when present):
  • Args name a person / company → restrict check_followups to threads with that recipient only.
  • Args name a topic / subject keyword → filter the candidate set to threads matching that keyword.
  • Args name a tighter window ("last 3 days", "this week") → adjust daysBack in check_followups.
  • Args say "no drafts, just list" → skip Phase 4 (drafting). Output the list only.
  • Args absent → run the FULL default workflow below.

DEFAULT WORKFLOW (only when args are absent or general):

PHASE 1 — Identify the candidate set:
  check_followups({ daysBack: 14, minDaysSilent: 3 })

PHASE 2 — Enrich each candidate (parallel):
  For every thread returned, in parallel:
  • gmail_read_thread({ threadId }) — get the full back-and-forth.
  • get_recipient_context({ email: <other party> }) — relationship history.
  • memory_search({ query: "<recipient name OR company>", limit: 3 }) — prior commitments.

PHASE 3 — Score + filter:
  • Drop threads where the user sent multiple follow-ups already (would be the 3rd nudge).
  • Drop threads about scheduling that have since been resolved on the calendar (check calendar_get_availability for the originally proposed time — if a booking exists, the conversation moved off-thread).
  • Sort remaining by: (a) client/VIP status from memory > (b) revenue keyword in original subject > (c) days waiting desc.

PHASE 4 — Draft a follow-up per surviving thread:
  Use draft_reply for 1-2 threads, gmail_batch_draft_replies for ≥3. Body rules:
  • 2-4 sentences max.
  • Reference the specific original ask in the first sentence ("Following up on the Q3 pricing question…").
  • End with a one-line concrete CTA ("Free to chat Thu 2-3pm?" or "Should I send the SOW as-is?").
  • Match the user's voice profile (already in this prompt's voice block).
  • Never use "just bumping this" / "circling back" / "wanted to check in" — replace with the specific ask.

PHASE 5 — Compose the report (chat reply):

  Found <N> threads waiting on a reply for 3+ days. Drafted nudges for <M> of them; <N-M> already had 2+ follow-ups so I left them alone.

  **Drafts ready:**
  - <recipient · subject · days waiting · link to draft>
  - ...

  **Skipped (already followed up twice):**
  - <recipient · subject> — consider a different channel (Slack DM, phone)
  - ...

EDGE CASES:
  • Zero stalled threads: "Nothing's waiting on you — every outbound has a reply or is < 3 days old."
  • Gmail not connected: stop immediately with the reconnect prompt.` + GROUND_RULES;

const PREP = `
COMMAND: /prep — Meeting prep document for the next 24 hours, one section per meeting, delivered to Canvas.

INTERPRET USER ARGS FIRST (override default scope when present):
  • Args name a specific meeting / attendee ("prep for the Acme call", "prep my 3pm") → prep ONLY that one meeting; skip everything else.
  • Args name a window ("just morning meetings", "this week's externals") → adjust calendar_unlimited_scan window + filter accordingly.
  • Args say "internal meetings too" → drop the external-only filter.
  • Args ask "what should I read before X" → produce a reading list (recent threads + Notion pages with attendees) instead of a full prep doc.
  • Args absent → run the FULL default workflow below.

DEFAULT WORKFLOW (only when args are absent or general):

PHASE 1 — Pull the meeting set:
  calendar_unlimited_scan({ daysAhead: 1, maxResults: 25, includeNotionCalendar: true })

  Filter to meetings that:
  • Have ≥1 external attendee (not just user's own org).
  • Are NOT all-day OR recurring focus blocks.
  • Have a start time in the next 24h.

PHASE 2 — Enrich each meeting in parallel (emit ALL tool calls for ALL meetings in your first action turn):
  For each meeting, fire in parallel:
  • gmail_unlimited_search({ query: "from:<attendee> OR to:<attendee>", maxResults: 10 })  — recent emails with attendees.
  • search_notion({ query: "<attendee names + meeting title keywords>", maxResults: 5 }) — Notion pages, prior meeting notes, deals.
  • memory_get_contact_profile({ email: <primary attendee> }) — relationship context.
  • web_search_instant({ query: "<company domain> recent news" }) — only for external attendees with a clear company affiliation.

PHASE 3 — Per-meeting synthesis:
  For each meeting, write a section that combines:
  • What the meeting is about (from event title + most recent thread subject).
  • Who's attending (names + role/company if known from memory).
  • What we know — 2-4 bullets from recent emails / Notion / memory.
  • Likely agenda — inferred from the latest thread or Notion page.
  • Open questions / decisions needed — extracted from the latest thread or Notion deal stage.
  • Suggested talking points (3 bullets).

PHASE 4 — Open Canvas:
  open_canvas with title "Meeting Prep — Next 24h", type "report". Skeleton:

  # Meeting Prep — Next 24h

  ## <Time> · <Title>
  **With:** <names + companies>
  **Meet link:** <link if present, else "Add via calendar_auto_generate_meet_links">

  ### What we know
  - <bullet 1>
  - <bullet 2>

  ### Likely agenda
  <2-3 sentences>

  ### Open questions
  - <q 1>
  - <q 2>

  ### Talking points
  1. <point 1>
  2. <point 2>
  3. <point 3>

  ---
  (repeat per meeting, chronological)

  Chat reply: "Prep doc ready in Canvas. <N> meetings tomorrow, the biggest one is <name at time>."

EDGE CASES:
  • No external meetings in 24h: "Calendar's mostly internal tomorrow — no external meetings to prep for."
  • Calendar not connected: stop with reconnect prompt.
  • Attendee can't be matched to a contact/company: write "External attendee, no prior context on file."` + GROUND_RULES;

const WEEKLY = `
COMMAND: /weekly — Weekly executive brief. Four mandatory sections, Canvas delivery.

INTERPRET USER ARGS FIRST (override default scope when present):
  • Args name a section ("just revenue", "what stalled", "what's next week") → output ONLY that section in chat (no canvas). Skip the other three.
  • Args name a person / company → bias every fetch toward that entity; the brief is about THEM.
  • Args narrow time ("just this week's wins", "since Monday") → adjust window accordingly.
  • Args absent → run the FULL default workflow below.

DEFAULT WORKFLOW (only when args are absent or general):

PHASE 1 — Parallel fetch across 7-day window:
  a) gmail_unlimited_search({ query: "newer_than:7d in:sent", maxResults: 100 }) — what the user sent.
  b) calendar_unlimited_scan({ daysAhead: 7, daysBack: 7, includeNotionCalendar: true }) — meetings held + upcoming.
  c) search_notion({ query: "<last 7 days> deal contract proposal", maxResults: 15 }) — recent CRM activity.
  d) check_followups({ daysBack: 14, minDaysSilent: 3 }) — stalled outbound.
  e) memory_unlimited_scan({ queries: ["this week revenue", "this week blockers", "next week priorities"], perQueryLimit: 5 })

PHASE 2 — Bucket the data into the four required sections:
  • DONE THIS WEEK: count of sent emails, number of meetings held, Notion entries logged, deals advanced. List the 5-8 most consequential items by name (not just "drafted 12 emails" — name the top 3 recipients/subjects).
  • STALLED: from (d) + (e). Each row: who/what · how long · the original ask · a one-line suggested next step.
  • COMING NEXT WEEK: from (b)'s forward half. List meetings in chronological order, expected priorities pulled from memory.
  • REVENUE SIGNALS: from (c) + any inbox thread with $$$/pricing keywords. Each row: contact/company · stage · last touch · what moves it forward.

PHASE 3 — Open Canvas, title "Weekly Brief — Week of <Mon Day>", type "report". Skeleton:

  # Weekly Brief — Week of <Mon Day>

  ## ✅ Done this week
  - <achievement 1, with link to artifact (sent email, Notion page, etc.)>
  - <achievement 2>
  - ...

  ## ⏳ Stalled
  | Who/What | Days waiting | Original ask | Next step |
  |---|---|---|---|
  | <Priya, Acme Q3> | 6 | SOW signature | Send revised SOW + offer call |
  | ...
  (use arcus-table block if ≥4 rows)

  ## 📅 Coming next week
  - **Mon <date>:** <key meetings + priorities>
  - **Tue <date>:** ...

  ## 💰 Revenue signals
  - <company · stage · last touch · next step>
  - ...

  Chat reply: 2 sentences — top achievement + biggest blocker.

EDGE CASES:
  • Empty bucket: omit the section entirely. A 3-section brief is fine; never pad with filler.
  • Missing integration: note "(<X> not connected — week's <X> activity not included)" at the top of the brief, then proceed with what IS available.` + GROUND_RULES;

const VIP = `
COMMAND: /vip — Surface what's waiting from high-value contacts. Read-only — never draft, never act.

INTERPRET USER ARGS FIRST (override default scope when present):
  • Args name a VIP category ("just clients", "just investors") → restrict to that category.
  • Args name a specific VIP → restrict to that person; show full recent history with them, not just unread.
  • Args ask "anyone urgent?" → run urgency detection on VIP threads and surface only urgency ≥8.
  • Args absent → run the FULL default workflow below.

DEFAULT WORKFLOW (only when args are absent or general):

PHASE 1 — Identify VIPs from memory:
  memory_relationship_intelligence({ limit: 25 })

  A VIP is any contact tagged in memory as:
  • client
  • investor
  • key partner / advisor
  • biggest-client
  • OR any contact mentioned in a saved [PREFERENCE] memory ("Priya is our biggest client")

PHASE 2 — Pull unread/unanswered from VIPs:
  For the VIP email list, in parallel:
  • gmail_unlimited_search({ query: "from:(<vip1> OR <vip2> OR ...) is:unread", maxResults: 30 })
  • check_followups({ daysBack: 14, minDaysSilent: 1, restrictToContacts: <VIP emails> })

PHASE 3 — Classify each surfaced thread:
  • UNREAD FROM VIP: they sent, user hasn't read. Highest priority.
  • READ BUT UNREPLIED: user opened, hasn't replied, ≥1 day old.
  • USER WAITING ON VIP: user sent ≥3 days ago, no reply (often a deal stalled).

PHASE 4 — Score urgency:
  Run gmail_detect_urgency on the unread set. Sort the whole list by:
  1. UNREAD with urgency ≥8 → top
  2. UNREAD with urgency < 8 → next
  3. READ-BUT-UNREPLIED → next
  4. USER-WAITING-ON-VIP → bottom (the user already knows about these)

PHASE 5 — Compose the report (chat reply only, NO Canvas, NO drafting):

  <N> things waiting from your VIPs.

  **🚨 Unread + urgent**
  - **<VIP name>** (<company>) · "<subject>" · <days ago>
    <one-line about what they want>
    [Open thread](<gmail link>)

  **📬 Unread**
  - <VIP> · "<subject>" · <days ago> — [open](<link>)
  - ...

  **👀 Opened, no reply yet**
  - <VIP> · "<subject>" · opened <when> — [open](<link>)

  **⏳ Your follow-ups out (no VIP reply)**
  - You messaged <VIP> <days> ago about "<subject>" — [open](<link>)

  (omit any section that has no items)

EDGE CASES:
  • Zero VIPs in memory: "I don't have any contacts saved as VIPs yet. Tell me which clients/investors matter most and I'll remember them."
  • All VIPs are caught up: "All clear — no VIPs waiting on you."
  • This command is READ-ONLY. Do NOT call draft_reply, send_email, or any write tool. Even if a thread looks urgent, surface it; the user decides.` + GROUND_RULES;

const VOICE = `
COMMAND: /voice — Rebuild the user's writing voice profile from their recent sent mail.

INTERPRET USER ARGS FIRST (override default scope when present):
  • Args name a sample size ("30 emails only", "last 200") → pass that as sampleSize to voice_profile_generate (cap 200).
  • Args ask "show current profile" / "what's my voice" → call get_voice_profile instead and report the existing profile. Do NOT rebuild.
  • Args specify a refinement ("less formal", "drop 'Best, M'") → call voice_profile_update with the change, do NOT rebuild from scratch.
  • Args absent → run the FULL default workflow below (rebuild from last 90 days).

DEFAULT WORKFLOW (only when args are absent or general):

PHASE 1 — Sanity check before the slow operation:
  gmail_get_profile() — confirm Gmail is connected. If the call fails with gmail_not_connected, stop here with: "Gmail isn't connected. Click connectors → Gmail, then run /voice again."

PHASE 2 — Run the rebuild:
  voice_profile_generate({ sampleSize: 90 })

  This is slow (10-30s). Do NOT call any other tool while it's running.

PHASE 3 — Report the new profile (chat reply, 3-4 sentences, no Canvas):

  Voice profile rebuilt from your last <N> sent emails.

  - **Tone:** <tone summary from the tool's response>
  - **Typical greeting:** "<greeting from the profile>"
  - **Typical sign-off:** "<sign-off from the profile>"
  - **Length avg:** ~<N> words

  Drafts after this run will use the new profile.

EDGE CASES:
  • voice_profile_generate returns insufficient_sent_mail: report exactly "I found only <N> sent emails — need at least 20 to build a useful profile. Send a few real emails and run /voice again."
  • voice_profile_generate timeouts: report "Rebuild timed out — try again in a minute when Gmail's API isn't busy."
  • Any other failure: report exactly what the tool said. Do NOT invent a profile summary.` + GROUND_RULES;

const AGENTS_SKILL = `
COMMAND: /agents — Inspect, manage, and create scheduled background agents directly in chat. No page navigation.

INTERPRET USER ARGS FIRST:
  • Args ask "pause <agent name>" / "stop <name>" → list_scheduled_agents first to confirm the agent exists; then tell the user the agent_id and that pause is a one-tap action in the agent card (we don't yet have a direct pause tool — be honest).
  • Args ask "create <description>" → run create_scheduled_agent with the inferred spec (use the agent-creation flow per CORE DOCTRINE).
  • Args ask about a specific agent's last run / next run / status → list_scheduled_agents, then surface only the matching agent in detail.
  • Args absent → run the default workflow below.

DEFAULT WORKFLOW:

PHASE 1 — list_scheduled_agents()

PHASE 2 — Summarize in chat (no canvas):

  If 0 agents:
    "You don't have any scheduled agents yet. A few popular ones I can set up for you:
    - **Morning Inbox Sweep** (daily 7am) — triages overnight email, drafts replies, flags urgent
    - **Daily VIP Digest** (daily 5pm) — surfaces what high-value contacts are waiting on
    - **Weekly Executive Brief** (Fri 4pm) — done / stalled / next week / revenue
    Want me to create one?"

  If 1+ agents:
    "You have <N> scheduled agents:

    | Agent | Schedule | Last run | Status |
    |---|---|---|---|
    | <name> | <human-readable cron, e.g. 'Daily 7am'> | <last_run_at relative, 'never' if null> | <active/paused> |
    ...

    Top of mind: <if any last_report_summary mentions a deadline / decision, highlight it>.

    Want to create another, pause one, or see what last <agent name>'s run delivered?"

PHASE 3 — Proactive suggestion:
  If the user has no agents touching a domain they clearly use (e.g. Notion connected but no Notion-touching agent), suggest ONE relevant agent in one sentence.` + GROUND_RULES;

const MEMORY_SKILL = `
COMMAND: /memory — Show what Arcus remembers about the user + their work. Offer to add / forget items directly in chat.

INTERPRET USER ARGS FIRST:
  • Args say "forget X" / "drop X" → memory_search to find the matching entry; tell the user the memory_id and that they can delete via the Memory tab in Settings (we don't have a direct delete tool yet — be honest).
  • Args say "remember X" → memory_save({ content: <X>, tags: ['user'] }) immediately. Confirm with "Saved."
  • Args ask about a specific person / topic → memory_search({ query: <args>, limit: 10 }) and report what's known about them.
  • Args absent → run the default workflow below.

DEFAULT WORKFLOW:

PHASE 1 — Pull a sample of recent memories (parallel):
  a) memory_search({ query: "[PREFERENCE]", limit: 8 })   — explicit user preferences
  b) memory_search({ query: "[RELATIONSHIP]", limit: 8 }) — contact relationships
  c) memory_search({ query: "[CONTEXT]", limit: 8 })      — general context

PHASE 2 — Summarize in chat (no canvas):

  "Here's what I remember about you and your work:

  **🧭 Preferences (<N> saved)**
  - <preference 1, plainly stated>
  - <preference 2>
  ...

  **👥 People I know about (<N> contacts)**
  - <contact 1>: <one-line relationship summary>
  - <contact 2>: <one-line>
  ...

  **📓 Recent context (<N> items)**
  - <item 1>
  - <item 2>

  Anything I have wrong? Tell me and I'll fix it. Or say 'remember X' and I'll save it."

PHASE 3 — Edge cases:
  • Zero memories: "I don't have anything saved about you yet. Tell me things you want me to remember — preferences ('always cc legal'), relationships ('Priya is our biggest client'), context ('the Q3 launch is the priority'). I'll keep them and apply them silently."
  • Memory disabled in settings: surface "Memory is currently OFF in your settings — I can't save or recall anything until you turn it back on (Settings → Memory)."` + GROUND_RULES;

const SETTINGS_SKILL = `
COMMAND: /settings — Show the user's current Arcus settings + offer to change them via chat. No page navigation.

This command does NOT require any tool call. The current settings are already visible to you in this prompt context (user instructions block, voice profile block, user style preference block, memory toggle). Read them and summarize.

DEFAULT WORKFLOW (always runs; args refine the summary):

PHASE 1 — Inspect current state from prompt context:
  • Voice profile: present yes/no (from "USER VOICE PROFILE" block if it appears in this prompt)
  • Tone (communication style): from "USER STYLE PREFERENCE" block — direct / balanced / warm
  • Length (verbosity): from same block — brief / normal / detailed
  • Custom instructions: present yes/no (from "USER INSTRUCTIONS — BINDING, ABSOLUTE PRIORITY" block, if it exists)
  • Memory: implicitly on (Arcus only fails to surface this when toggle is off)
  • Action mode (Ask / Auto): inferred from whether the "ACT MODE" overlay appears in the prompt

PHASE 2 — Summarize in chat (no canvas):

  "Here's how Arcus is configured for you right now:

  - **Voice profile**: <built / not built — from sent mail>
  - **Tone**: <Direct / Balanced / Warm>
  - **Length**: <Brief / Normal / Detailed>
  - **Action mode**: <Ask before acting / Act without asking>
  - **Custom instructions**: <yes — preview first 80 chars / none>
  - **Memory**: <on / off>

  To change any of these:
  - **Tone, length, action mode**: use the dropdowns in the prompt box (next to the model selector).
  - **Custom instructions, memory**: open the gear icon in the top-right of chat → Instructions / Memory tabs.
  - **Voice profile**: run /voice to rebuild it from your last 90 days of sent mail.

  Or tell me what to change in natural language — 'be more concise', 'never use exclamation marks', 'always cc legal@x.com' — and I'll guide you to the right place to save it."

PHASE 3 — Args interpretation:
  • Args ask "what's my tone" / "what tone are you using" → answer the tone question specifically + offer to change.
  • Args ask "change tone to X" / "make me more X" → confirm the requested change, point to the prompt-box dropdown OR offer to save the change as a custom instruction.
  • Args ask about a specific setting → answer that one specifically.` + GROUND_RULES;

export const SLASH_COMMANDS: SlashCommand[] = [
  { name: 'brief',     description: 'Morning briefing across all 5 VAs.',                                  category: 'workflows', icon: '☀️', kind: 'prompt', template: BRIEF },
  { name: 'inbox',     description: 'Triage inbox: digest newsletters, flag VIPs, draft client replies.', category: 'workflows', icon: '📧', kind: 'prompt', template: INBOX },
  { name: 'follow-up', description: 'Find stalled threads. Draft polite nudges.',                          category: 'workflows', icon: '⏳', kind: 'prompt', template: FOLLOW_UP },
  { name: 'prep',      description: 'Meeting prep doc for the next 24 hours.',                             category: 'workflows', icon: '🗓️', kind: 'prompt', template: PREP },
  { name: 'weekly',    description: 'Weekly executive brief: done / stalled / next / revenue.',           category: 'workflows', icon: '📊', kind: 'prompt', template: WEEKLY },
  { name: 'vip',       description: 'Surface what high-value contacts are waiting on. Read-only.',         category: 'workflows', icon: '⭐', kind: 'prompt', template: VIP },
  { name: 'voice',     description: 'Rebuild voice profile from last 90 days of sent mail.',              category: 'profile',   icon: '🎤', kind: 'prompt', template: VOICE },
  { name: 'agents',    description: 'List your scheduled agents + offer to create / pause / manage.',     category: 'workflows', icon: '🤖', kind: 'prompt', template: AGENTS_SKILL },
  { name: 'memory',    description: 'Show what Arcus remembers about you + your work.',                    category: 'workflows', icon: '🧠', kind: 'prompt', template: MEMORY_SKILL },
  { name: 'settings',  description: 'Show your current Arcus settings + offer to change them in chat.',    category: 'workflows', icon: '⚙️', kind: 'prompt', template: SETTINGS_SKILL },
  { name: 'clear',     description: 'Clear the current conversation.',                                     category: 'navigation', icon: '🧹', kind: 'client', clientHandler: 'clearConversation' },
  { name: 'help',      description: 'Show all slash commands.',                                            category: 'navigation', icon: '❓', kind: 'client', clientHandler: 'showHelp' },
];

export function findSlashCommand(name: string): SlashCommand | undefined {
  const normalized = name.trim().toLowerCase().replace(/^\//, '');
  return SLASH_COMMANDS.find(c => c.name === normalized);
}

export function expandSlashCommand(message: string): {
  expanded: string;
  matchedCommand?: SlashCommand;
} {
  const trimmed = message.trim();
  if (!trimmed.startsWith('/')) return { expanded: message };

  const firstWhitespace = trimmed.search(/\s/);
  const cmdToken = firstWhitespace === -1 ? trimmed : trimmed.slice(0, firstWhitespace);
  const userArgs = firstWhitespace === -1 ? '' : trimmed.slice(firstWhitespace + 1).trim();
  const command = findSlashCommand(cmdToken);

  if (!command || command.kind !== 'prompt' || !command.template) {
    return { expanded: message };
  }

  const expanded = userArgs
    ? `${command.template}\n\n═══════════════════════════════════════════════════════\nUSER ARGUMENTS — HIGHEST PRIORITY, OVERRIDES THE DEFAULT WORKFLOW:\n"${userArgs}"\n\nDo NOT run the full default workflow above when args are present. Match the args against the "INTERPRET USER ARGS FIRST" branch table at the top of the spec and execute ONLY the branch that matches. If the args narrow the scope (a specific question, a specific person, a specific topic, a specific section), answer THAT — skip phases that don't serve it. The default workflow is what to do when args are absent; with args present, the spec is a menu of options + the args pick from the menu.`
    : command.template;

  return { expanded, matchedCommand: command };
}

export function filterSlashCommands(prefix: string): SlashCommand[] {
  const p = prefix.trim().toLowerCase().replace(/^\//, '');
  if (!p) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter(c => c.name.includes(p));
}
