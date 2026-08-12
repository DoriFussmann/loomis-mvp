create table if not exists public.gap_quote_state_buckets (
  bucket_key text primary key,
  label text not null,
  states text[] not null default '{}',
  lives_min integer not null default 5,
  lives_max integer not null default 100,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gap_quote_rates (
  id text primary key,
  bucket_key text not null references public.gap_quote_state_buckets(bucket_key) on update cascade on delete cascade,
  deductible numeric not null,
  benefit numeric not null,
  rate_ee_only numeric not null,
  rate_ee_spouse numeric not null,
  rate_ee_children numeric not null,
  rate_family numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket_key, deductible, benefit)
);

create table if not exists public.gap_quote_settings (
  id text primary key,
  admin_fee numeric not null default 0,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_gap_quote_state_buckets_updated_at on public.gap_quote_state_buckets;
create trigger trg_gap_quote_state_buckets_updated_at
before update on public.gap_quote_state_buckets
for each row
execute function public.set_updated_at();

drop trigger if exists trg_gap_quote_rates_updated_at on public.gap_quote_rates;
create trigger trg_gap_quote_rates_updated_at
before update on public.gap_quote_rates
for each row
execute function public.set_updated_at();

drop trigger if exists trg_gap_quote_settings_updated_at on public.gap_quote_settings;
create trigger trg_gap_quote_settings_updated_at
before update on public.gap_quote_settings
for each row
execute function public.set_updated_at();

insert into public.gap_quote_settings (id, admin_fee)
values ('default', 0)
on conflict (id) do nothing;

insert into public.gap_quote_state_buckets (bucket_key, label, states, lives_min, lives_max, sort_order)
values
  (
    'standard',
    'Standard States',
    array['AL','AR','AZ','DC','FL','GA','HI','IA','IL','KS','KY','LA','MA','MS','NE','NC','NV','OK','OR','PA','SC','SD','TN','TX','UT','VA','WI','WV','WY']::text[],
    5, 100, 1
  ),
  (
    'lr60',
    '60% LR states',
    array['CO','IN','MO','NH']::text[],
    5, 100, 2
  ),
  (
    'oh',
    'OH',
    array['OH']::text[],
    5, 100, 3
  ),
  (
    'mi',
    'MI',
    array['MI']::text[],
    5, 100, 4
  ),
  (
    'fl_50_100',
    'FL 50-100 lives',
    array['FL']::text[],
    51, 100, 5
  )
on conflict (bucket_key) do nothing;

alter table public.gap_quote_state_buckets enable row level security;
alter table public.gap_quote_rates enable row level security;
alter table public.gap_quote_settings enable row level security;

drop policy if exists "gap_quote_state_buckets_service_role_all" on public.gap_quote_state_buckets;
create policy "gap_quote_state_buckets_service_role_all"
on public.gap_quote_state_buckets
for all
to service_role
using (true)
with check (true);

drop policy if exists "gap_quote_rates_service_role_all" on public.gap_quote_rates;
create policy "gap_quote_rates_service_role_all"
on public.gap_quote_rates
for all
to service_role
using (true)
with check (true);

drop policy if exists "gap_quote_settings_service_role_all" on public.gap_quote_settings;
create policy "gap_quote_settings_service_role_all"
on public.gap_quote_settings
for all
to service_role
using (true)
with check (true);
