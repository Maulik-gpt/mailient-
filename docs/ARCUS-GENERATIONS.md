# Arcus — The Three Generations (map of what's live)

> **Read this before refactoring anything under `lib/arcus*`.**
> Arcus grew in three overlapping generations. All three are currently **live** —
> each one backs a different user-facing surface. None is dead code you can
> delete mechanically. "Consolidating" them is a *product* decision (which
> surface wins), not a safe cleanup.
>
> Verified state at time of writing (2026-06-08): `tsc --noEmit` = 0 errors,
> `next build --webpack` = exit 0. The system **builds and runs**. The problem is
> sprawl, not breakage.

---

## Generation 1 — Legacy flat JS (`lib/arcus-*.js`)

~60 flat files at the root of `lib/` (e.g. `arcus-ai.js`, `arcus-planner.js`,
`arcus-plan-engine.js`, `arcus-operator-runtime*.js`, `arcus-executor-engine.js`,
`arcus-agent-loop.js`, `arcus-multi-agent-*.js`).

**Still imported by exactly 4 routes** (everything else has moved off it):

| Route | Imports |
|-------|---------|
| `app/api/agent-talk/chat-arcus-v2/route.ts` | `arcus-ai.js`, `arcus-agent-loop.js` |
| `app/api/arcus/execute/route.ts` | `arcus-executor-engine` |
| `app/api/arcus/plan/route.ts` | `arcus-planner` |
| `app/api/nudges/route.js` | `arcus-ai.js` |

**Status:** legacy but load-bearing. Retire only after those 4 routes are
migrated or removed. Do **not** delete the modules while these imports exist.

---

## Generation 2 — `lib/arcus/` (TypeScript) — **THE LIVE AGENT PATH**

This is the generation behind the scheduled "while you sleep" agents — the
product the recent PART 80–84 commits have been shipping.

**Entry → exit chain:**

```
GET /api/cron/run-agents                 (cron-job.org / Vercel cron trigger)
  └─ lib/arcus/run-agent.ts              runAgentTask()
       └─ lib/arcus/multi-va/orchestrator.ts   runAgentAsCommittee()  (fan out ≤5 VAs)
            └─ lib/arcus/multi-va/va-runner.ts  runVA()  (one VA each, parallel)
                 └─ lib/arcus/loop.ts            runAgentLoop()  (SSE agentic loop)
                      └─ lib/arcus/tools.ts      executeTool() + getAvailableTools()
       └─ lib/arcus/multi-va/aggregator.ts       buildCommitteeReport()
```

**Supporting modules:** `memory.ts` (dual-writes Supabase `arcus_memories` +
Supermemory), `system-prompt.ts`, `orchestrator.ts` (typed `buildExecutionPlan`),
`intent-classifier.ts`, `inbox-pipeline.ts`, `agent-approvals.ts`,
`signal-density.ts`.

**Also serves** the `/api/arcus/agents/*` settings + run-history routes and the
interactive `/api/arcus/chat` route.

**Status:** canonical for scheduled agents. This is the path to extend when the
ask is "agents do X."

---

## Generation 3 — `lib/arcus-v3/` (TypeScript) — separate product surface

A self-contained runtime with its own dispatcher/executor/handlers/normalizers
and its **own** `schema.sql`.

**Backs the entire `/api/arcus/v3/*` surface + the `/arcus-v3` page:**

- `app/api/arcus/v3/chat`, `/trigger`, `/plans/*`, `/preferences`, `/audit`,
  `/integrations`
- `app/api/arcus/v3/oauth/*` (gmail / gcal / notion / slack OAuth)
- `app/api/arcus/v3/webhooks/{gcal,slack}`
- `app/api/arcus/v3/cron/{plan-mode,poll-notion,renew-channels}`
- `app/arcus-v3/page.tsx` + its hooks/components

**Status:** live and independent. Its OAuth + webhooks are wired separately from
Generation 2. Touching it does not affect scheduled agents and vice versa.

---

## Schema — where the tables are defined

| Table | Defined in | Notes |
|-------|-----------|-------|
| `arcus_agents` | `supabase/migrations/arcus_agents.sql` (canonical, added 2026-06) **and** `lib/arcus-v3/schema.sql` | Previously ONLY in the v3 schema file; now also a proper migration. |
| `arcus_agent_runs` | `supabase/migrations/arcus_agent_runs.sql` | Base columns. |
| `arcus_agent_runs.signal_score`, `.delivery_decision` | `supabase/migrations/arcus_agent_runs_part60_signal.sql` (added 2026-06) | PART 60 wrote these columns before any migration created them — the write silently failed until this migration landed. |
| `arcus_memories`, `arcus_audit_log`, `arcus_agent_pending_actions`, `arcus_canvas_state`, `arcus_contacts_and_rules`, `arcus_gmail_scope_cache`, `arcus_session_approvals`, `arcus_agent_scratchpad` | `supabase/migrations/*.sql` | One file each. |
| `arcus_integrations`, `arcus_plans`, `arcus_plan_steps`, `arcus_events_queue`, `arcus_briefs` | `lib/arcus-v3/schema.sql` only | Generation-3 tables; not yet mirrored into `supabase/migrations/`. |

---

## If you want to actually consolidate

It's a product call, in this order of safety:

1. **Safe now:** keep all three; treat Generation 2 (`lib/arcus/`) as canonical
   for new agent work; stop adding to Generations 1 and 3.
2. **Medium:** migrate the 4 legacy-`.js` routes off Generation 1, then delete
   `lib/arcus-*.js`. Verify with `next build --webpack` after — webpack resolves
   dynamic `import()` at build time, so a missed reference fails the build, not tsc.
3. **Large:** decide whether `/arcus-v3` (Generation 3) or the agents surface
   (Generation 2) is the future, and retire the loser. This deletes a live
   user-facing surface — needs an explicit product decision first.
