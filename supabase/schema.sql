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
alter table public.profiles enable row level security;
alter table public.apps     enable row level security;

-- ---- profiles policies ----
drop policy if exists "read own or admin reads all" on public.profiles;
create policy "read own or admin reads all" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

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
