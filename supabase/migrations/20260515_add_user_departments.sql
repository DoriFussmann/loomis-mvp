alter table public.users
add column if not exists departments text[] not null default '{}';

alter table public.users
drop constraint if exists users_departments_valid;

alter table public.users
add constraint users_departments_valid
check (departments <@ array['P&C', 'Benefits']::text[]);
