create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  dob date not null,
  member_id text not null unique,
  insurer_name text not null,
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;

drop policy if exists "clients_service_role_all" on public.clients;
create policy "clients_service_role_all"
on public.clients
for all
to service_role
using (true)
with check (true);
