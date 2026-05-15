create extension if not exists "pgcrypto";

create table if not exists public.users (
  id text primary key,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'user')),
  allowed_pages text[] not null default '{}',
  departments text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users
drop constraint if exists users_departments_valid;

alter table public.users
add constraint users_departments_valid
check (departments <@ array['P&C', 'Benefits']::text[]);

create table if not exists public.pages (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text not null default '',
  variables jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prompts (
  id text primary key,
  name text not null,
  page_slug text not null references public.pages(slug) on update cascade on delete cascade,
  template text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists trg_pages_updated_at on public.pages;
create trigger trg_pages_updated_at
before update on public.pages
for each row
execute function public.set_updated_at();

drop trigger if exists trg_prompts_updated_at on public.prompts;
create trigger trg_prompts_updated_at
before update on public.prompts
for each row
execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.pages enable row level security;
alter table public.prompts enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.users u
    where u.auth_user_id = auth.uid()
      and u.role = 'admin'
  );
$$;

create or replace function public.allowed_pages_for_user()
returns text[]
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select u.allowed_pages
      from public.users u
      where u.auth_user_id = auth.uid()
      limit 1
    ),
    '{}'::text[]
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.allowed_pages_for_user() to anon, authenticated;

drop policy if exists "users_select_own_or_admin" on public.users;
create policy "users_select_own_or_admin"
on public.users
for select
to authenticated
using (
  auth_user_id = auth.uid() or public.is_admin()
);

drop policy if exists "users_admin_insert" on public.users;
create policy "users_admin_insert"
on public.users
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "users_admin_update" on public.users;
create policy "users_admin_update"
on public.users
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "users_admin_delete" on public.users;
create policy "users_admin_delete"
on public.users
for delete
to authenticated
using (public.is_admin());

drop policy if exists "pages_read_by_assigned_user" on public.pages;
create policy "pages_read_by_assigned_user"
on public.pages
for select
to authenticated
using (
  public.is_admin() or slug = any(public.allowed_pages_for_user())
);

drop policy if exists "pages_admin_write" on public.pages;
create policy "pages_admin_write"
on public.pages
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "prompts_read_by_assigned_user" on public.prompts;
create policy "prompts_read_by_assigned_user"
on public.prompts
for select
to authenticated
using (
  public.is_admin() or page_slug = any(public.allowed_pages_for_user())
);

drop policy if exists "prompts_admin_write" on public.prompts;
create policy "prompts_admin_write"
on public.prompts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
