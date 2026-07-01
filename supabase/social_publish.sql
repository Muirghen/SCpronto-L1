-- =====================================================================
-- SC Pronto — real Facebook/Instagram publishing for the Scheduler
-- Run AFTER schema.sql and scheduler.sql. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- social_accounts: org-wide Meta (Facebook Page / Instagram) credentials.
-- Single row, admin-managed, never exposed to non-admins via RLS.
-- ---------------------------------------------------------------------
create table if not exists public.social_accounts (
  id                    int primary key default 1,
  fb_page_id            text,
  fb_page_access_token  text,
  ig_user_id            text,
  updated_at            timestamptz not null default now(),
  constraint social_accounts_singleton check (id = 1)
);

alter table public.social_accounts enable row level security;

drop policy if exists "admins manage social accounts" on public.social_accounts;
create policy "admins manage social accounts" on public.social_accounts
  for all using (public.is_admin()) with check (public.is_admin());

-- Org-wide Meta credentials, readable by any active employee so the
-- Scheduler can publish on the team's behalf. Security definer keeps the
-- token out of the social_accounts RLS (admin-only) while still gating
-- on active employee status. Never sent to the browser — only read
-- inside server actions / the cron publisher.
create or replace function public.social_credentials()
returns table(fb_page_id text, fb_page_access_token text, ig_user_id text)
language sql
security definer
set search_path = public
as $$
  select fb_page_id, fb_page_access_token, ig_user_id
  from public.social_accounts
  where id = 1 and public.is_active_user();
$$;

-- ---------------------------------------------------------------------
-- scheduled_posts: track real publish results and allow a 'failed' state.
-- ---------------------------------------------------------------------
alter table public.scheduled_posts add column if not exists fb_post_id text;
alter table public.scheduled_posts add column if not exists ig_post_id text;
alter table public.scheduled_posts add column if not exists error text;

alter table public.scheduled_posts drop constraint if exists scheduled_posts_status_check;
alter table public.scheduled_posts add constraint scheduled_posts_status_check
  check (status in ('draft', 'scheduled', 'posted', 'failed'));

create index if not exists scheduled_posts_due_idx
  on public.scheduled_posts (scheduled_at)
  where status = 'scheduled';
