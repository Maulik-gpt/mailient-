-- Arcus Plan Engine Schema
-- PlanArtifacts + TodoExecutionItems + SearchSessions
-- Safe to run multiple times (idempotent).

-- ============================================================
-- 1. Plan Artifacts — persisted plan objects with approval lock
-- ============================================================
create table if not exists public.arcus_plan_artifacts (
  id bigserial primary key,
  plan_id text not null,
  user_id text not null,
  run_id text references public.arcus_runs(run_id) on delete set null,
  conversation_id text,

  -- Plan content
  title text not null default '',
  objective text not null default '',
  assumptions jsonb not null default '[]'::jsonb,
  questions_answered jsonb not null default '[]'::jsonb,
  acceptance_criteria jsonb not null default '[]'::jsonb,

  -- Plan lifecycle
  status text not null default 'draft',
    -- draft -> approved -> executing -> completed | failed | cancelled
  version integer not null default 1,
  approved_at timestamptz,
  approved_version integer,
  locked boolean not null default false,

  -- Metadata
  source_message text,
  intent text,
  complexity text default 'simple',
  canvas_type text default 'action_plan',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (plan_id)
);

create index if not exists idx_arcus_plan_artifacts_user
  on public.arcus_plan_artifacts (user_id, status, created_at desc);

create index if not exists idx_arcus_plan_artifacts_run
  on public.arcus_plan_artifacts (run_id);

-- ============================================================
-- 2. Todo Execution Items — ordered executable units
-- ============================================================
create table if not exists public.arcus_todo_items (
  id bigserial primary key,
  todo_id text not null,
  plan_id text not null references public.arcus_plan_artifacts(plan_id) on delete cascade,
  user_id text not null,
  run_id text references public.arcus_runs(run_id) on delete set null,

  -- Task definition
  title text not null,
  description text default '',
  action_type text not null default 'generic_task',
  action_payload jsonb not null default '{}'::jsonb,
  input_schema jsonb not null default '{}'::jsonb,

  -- Ordering and dependencies
  sort_order integer not null default 0,
  depends_on text[] not null default '{}',

  -- Execution state
  status text not null default 'pending',
    -- pending -> ready -> running -> completed | failed | skipped | blocked_approval
  approval_mode text not null default 'auto',
    -- auto | manual | skip
  approval_token text,

  -- Reliability
  idempotency_key text not null,
  retry_policy jsonb not null default '{"max_attempts": 3, "backoff_ms": 1000}'::jsonb,
  attempt_count integer not null default 0,

  -- Result
  result_payload jsonb,
  error_message text,
  external_refs jsonb default '{}'::jsonb,

  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (todo_id)
);

create index if not exists idx_arcus_todo_items_plan
  on public.arcus_todo_items (plan_id, sort_order asc);

create index if not exists idx_arcus_todo_items_status
  on public.arcus_todo_items (user_id, status);

-- ============================================================
-- 3. Search Sessions — Perplexity-style search transparency
-- ============================================================
create table if not exists public.arcus_search_sessions (
  id bigserial primary key,
  session_id text not null,
  user_id text not null,
  run_id text references public.arcus_runs(run_id) on delete set null,
  plan_id text references public.arcus_plan_artifacts(plan_id) on delete set null,

  -- Search state
  status text not null default 'queued',
    -- queued -> searching -> source_processing -> complete
  query text not null default '',
  source_type text not null default 'email',
    -- email | notes | web | calendar | notion | tasks
  result_count integer not null default 0,
  selected_snippets jsonb not null default '[]'::jsonb,

  -- Events log (append-only within session)
  events jsonb not null default '[]'::jsonb,

  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),

  unique (session_id)
);

create index if not exists idx_arcus_search_sessions_run
  on public.arcus_search_sessions (run_id, created_at asc);
