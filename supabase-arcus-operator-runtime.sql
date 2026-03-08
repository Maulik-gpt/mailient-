-- Arcus Operator Runtime V2 schema
-- Safe to run multiple times.

create table if not exists public.arcus_runs (
  id bigserial primary key,
  user_id text not null,
  run_id text not null,
  conversation_id text,
  mission_id text,
  status text not null default 'running',
  phase text not null default 'thinking',
  intent text not null default 'general',
  complexity text not null default 'simple',
  plan_snapshot jsonb not null default '[]'::jsonb,
  memory jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id)
);

create index if not exists idx_arcus_runs_user_conversation
  on public.arcus_runs (user_id, conversation_id, created_at desc);

create table if not exists public.arcus_run_steps (
  id bigserial primary key,
  user_id text not null,
  run_id text not null references public.arcus_runs(run_id) on delete cascade,
  step_id text not null,
  step_order integer not null default 1,
  kind text not null default 'think',
  status text not null default 'pending',
  label text not null default '',
  detail text,
  evidence jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (run_id, step_id)
);

create index if not exists idx_arcus_run_steps_run
  on public.arcus_run_steps (run_id, step_order asc);

create table if not exists public.arcus_run_events (
  id bigserial primary key,
  user_id text not null,
  run_id text not null references public.arcus_runs(run_id) on delete cascade,
  event_type text not null default 'run_event',
  phase text not null default 'thinking',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_arcus_run_events_run
  on public.arcus_run_events (run_id, created_at asc);

create table if not exists public.arcus_jobs (
  id bigserial primary key,
  user_id text not null,
  run_id text not null references public.arcus_runs(run_id) on delete cascade,
  job_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  worker_id text,
  error_message text,
  available_at timestamptz not null default now(),
  lease_expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_arcus_jobs_queue
  on public.arcus_jobs (status, available_at asc);
