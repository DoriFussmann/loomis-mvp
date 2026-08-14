create table if not exists public.gap_quote_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source text not null check (source in ('inbound', 'manual')),
  status text not null check (status in ('processing', 'complete', 'failed', 'non_qualifying')),
  sender_email text not null default '',
  subject text not null default '',
  inbound_message_id text unique,
  extract jsonb,
  result jsonb,
  error_message text not null default '',
  reply_sent_at timestamptz
);

create index if not exists gap_quote_runs_created_at_idx
  on public.gap_quote_runs (created_at desc);

drop trigger if exists trg_gap_quote_runs_updated_at on public.gap_quote_runs;
create trigger trg_gap_quote_runs_updated_at
before update on public.gap_quote_runs
for each row
execute function public.set_updated_at();

alter table public.gap_quote_runs enable row level security;

drop policy if exists "gap_quote_runs_service_role_all" on public.gap_quote_runs;
create policy "gap_quote_runs_service_role_all"
on public.gap_quote_runs
for all
to service_role
using (true)
with check (true);
