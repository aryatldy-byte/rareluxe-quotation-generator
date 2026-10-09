-- RareLuxe Quotation Generator: run this once in Supabase → SQL Editor.
create extension if not exists "pgcrypto";

do $$ begin
  create type event_type as enum
    ('birthday','haldi','anniversary','bride_to_be','groom_to_be','wedding','corporate');
exception when duplicate_object then null; end $$;

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists themes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text not null,
  event_type event_type,                 -- null = fallback theme for any event type
  is_custom boolean not null default false, -- true = uploaded by a client, false = admin default
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  date date not null,
  type event_type not null,
  title text,                             -- optional display title, e.g. "1st Birthday Décor"
  theme_id uuid references themes(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  quantity int not null default 1 check (quantity > 0),
  rate numeric(12,2) not null default 0 check (rate >= 0),
  total numeric(14,2) generated always as (quantity * rate) stored,
  position int not null default 0
);

create table if not exists quotations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  total_amount numeric(14,2) not null default 0,
  pdf_url text,
  created_at timestamptz not null default now()
);

create index if not exists items_event_idx on items(event_id);
create index if not exists quotations_event_idx on quotations(event_id);
create index if not exists themes_type_idx on themes(event_type);

-- Row Level Security -------------------------------------------------------
-- NOTE: these policies let the public anon key read/write everything, which is
-- what a no-login internal tool needs. See README → "Hardening" to tighten.
alter table clients enable row level security;
alter table themes enable row level security;
alter table events enable row level security;
alter table items enable row level security;
alter table quotations enable row level security;

do $$
declare t text;
begin
  foreach t in array array['clients','themes','events','items','quotations'] loop
    execute format('drop policy if exists "app_access" on %I', t);
    execute format('create policy "app_access" on %I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Storage buckets ----------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('themes', 'themes', true), ('quotations', 'quotations', true)
on conflict (id) do update set public = true;

drop policy if exists "rl_storage_read" on storage.objects;
drop policy if exists "rl_storage_insert" on storage.objects;
drop policy if exists "rl_storage_update" on storage.objects;
drop policy if exists "rl_storage_delete" on storage.objects;

create policy "rl_storage_read" on storage.objects for select
  using (bucket_id in ('themes','quotations'));
create policy "rl_storage_insert" on storage.objects for insert
  with check (bucket_id in ('themes','quotations'));
create policy "rl_storage_update" on storage.objects for update
  using (bucket_id in ('themes','quotations'));
create policy "rl_storage_delete" on storage.objects for delete
  using (bucket_id in ('themes','quotations'));
