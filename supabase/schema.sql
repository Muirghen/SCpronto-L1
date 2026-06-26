-- =====================================================================
-- SC Pronto — Employee Portal schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE throughout.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Roles & status enums
-- ---------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('employee', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_status as enum ('active', 'disabled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_kind as enum ('link', 'embedded');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- profiles: one row per auth user, holds role + status
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        user_role   not null default 'employee',
  status      user_status not null default 'active',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- apps: the tiles employees see on /apps. Managed by admins.
-- ---------------------------------------------------------------------
create table if not exists public.apps (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  url         text,                       -- used when kind = 'link'
  icon_emoji  text default '🔗',
  icon_url    text,                       -- optional image icon; overrides emoji
  kind        app_kind not null default 'link',
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- Backfill the icon_url column on databases created before it existed.
alter table public.apps add column if not exists icon_url text;

-- ---------------------------------------------------------------------
-- user_apps: each user's personal library — which catalog apps they've
-- added and in what order. One row per (user, app).
-- ---------------------------------------------------------------------
create table if not exists public.user_apps (
  user_id     uuid not null references auth.users (id) on delete cascade,
  app_id      uuid not null references public.apps (id) on delete cascade,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  primary key (user_id, app_id)
);

create index if not exists user_apps_user_order_idx
  on public.user_apps (user_id, sort_order);

-- ---------------------------------------------------------------------
-- designs: saved Social Studio designs, one row per saved canvas.
-- ---------------------------------------------------------------------
create table if not exists public.designs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  format_key   text not null default 'ig-post',
  data         jsonb not null,
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists designs_user_idx
  on public.designs (user_id, updated_at desc);

-- ---------------------------------------------------------------------
-- design_shares: which other users a design's owner has shared it with.
-- ---------------------------------------------------------------------
create table if not exists public.design_shares (
  design_id      uuid not null references public.designs (id) on delete cascade,
  shared_user_id uuid not null references auth.users (id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (design_id, shared_user_id)
);

create index if not exists design_shares_user_idx
  on public.design_shares (shared_user_id);

-- ---------------------------------------------------------------------
-- Helper: is the current user an admin?  (security definer avoids
-- recursive RLS checks against the profiles table.)
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

-- Is the current user an active employee? (lets colleagues find each other
-- for sharing without exposing privileged fields). Security definer avoids
-- recursive RLS against profiles.
create or replace function public.is_active_user()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
  );
$$;

-- Does the current user own this design?
create or replace function public.owns_design(d uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.designs where id = d and user_id = auth.uid()
  );
$$;

-- Has this design been shared with the current user?
create or replace function public.design_shared_with_me(d uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.design_shares
    where design_id = d and shared_user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------
-- New-user trigger: create a profile, enforce the company email domain,
-- and auto-promote the very first/designated admin.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed_domain text := 'scpronto.com';
  first_admin    text := 'fabio@scpronto.com';
  is_first_admin boolean;
begin
  -- Reject sign-ups outside the company domain.
  if lower(split_part(new.email, '@', 2)) <> allowed_domain then
    raise exception 'Only @% email addresses may register.', allowed_domain;
  end if;

  is_first_admin := lower(new.email) = first_admin;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when is_first_admin then 'admin'::user_role else 'employee'::user_role end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles      enable row level security;
alter table public.apps          enable row level security;
alter table public.user_apps     enable row level security;
alter table public.designs       enable row level security;
alter table public.design_shares enable row level security;

-- ---- profiles policies ----
drop policy if exists "read own or admin reads all" on public.profiles;
create policy "read own or admin reads all" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- Active employees can read colleagues (needed to pick people to share with).
drop policy if exists "active users read profiles" on public.profiles;
create policy "active users read profiles" on public.profiles
  for select using (public.is_active_user());

drop policy if exists "user updates own non-privileged fields" on public.profiles;
create policy "user updates own non-privileged fields" on public.profiles
  for update using (id = auth.uid());

drop policy if exists "admin updates any profile" on public.profiles;
create policy "admin updates any profile" on public.profiles
  for update using (public.is_admin());

-- ---- apps policies ----
drop policy if exists "active users read apps" on public.apps;
create policy "active users read apps" on public.apps
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and status = 'active'
    )
  );

drop policy if exists "admins write apps" on public.apps;
create policy "admins write apps" on public.apps
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- user_apps policies: each user owns only their own library ----
drop policy if exists "read own library" on public.user_apps;
create policy "read own library" on public.user_apps
  for select using (user_id = auth.uid());

drop policy if exists "add to own library" on public.user_apps;
create policy "add to own library" on public.user_apps
  for insert with check (user_id = auth.uid());

drop policy if exists "reorder own library" on public.user_apps;
create policy "reorder own library" on public.user_apps
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "remove from own library" on public.user_apps;
create policy "remove from own library" on public.user_apps
  for delete using (user_id = auth.uid());

-- ---- designs policies: owner has full control; shared users can view+edit ----
drop policy if exists "manage own designs" on public.designs;

drop policy if exists "read own or shared designs" on public.designs;
create policy "read own or shared designs" on public.designs
  for select using (user_id = auth.uid() or public.design_shared_with_me(id));

drop policy if exists "insert own designs" on public.designs;
create policy "insert own designs" on public.designs
  for insert with check (user_id = auth.uid());

drop policy if exists "update own or shared designs" on public.designs;
create policy "update own or shared designs" on public.designs
  for update using (user_id = auth.uid() or public.design_shared_with_me(id));

drop policy if exists "delete own designs" on public.designs;
create policy "delete own designs" on public.designs
  for delete using (user_id = auth.uid());

-- ---- design_shares policies: owner manages; recipient can see their share ----
drop policy if exists "owner or recipient reads shares" on public.design_shares;
create policy "owner or recipient reads shares" on public.design_shares
  for select using (public.owns_design(design_id) or shared_user_id = auth.uid());

drop policy if exists "owner adds shares" on public.design_shares;
create policy "owner adds shares" on public.design_shares
  for insert with check (public.owns_design(design_id));

drop policy if exists "owner removes shares" on public.design_shares;
create policy "owner removes shares" on public.design_shares
  for delete using (public.owns_design(design_id));

-- ---------------------------------------------------------------------
-- Guard against employees self-promoting to admin via the user-update
-- policy. Only admins may change role/status fields.
-- ---------------------------------------------------------------------
create or replace function public.protect_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role <> old.role or new.status <> old.status)
     and not public.is_admin() then
    raise exception 'Only admins can change role or status.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_privileged_fields();
