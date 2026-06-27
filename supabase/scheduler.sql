-- =====================================================================
-- SC Pronto — Publisher / content scheduler
-- Run AFTER schema.sql (needs public.designs + auth.users).
-- Safe to re-run.
--
-- A scheduled_post is one planned social post: a channel (instagram /
-- facebook / x), a caption, a slot time, and an optional image — either a
-- saved Studio design (design_id) or an uploaded/url image (image_url).
-- RLS keeps every user to their OWN rows only.
-- =====================================================================

create table if not exists public.scheduled_posts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  channel       text not null check (channel in ('instagram', 'facebook', 'x')),
  caption       text not null default '',
  -- Optional image sources. A post can reference a saved design and/or carry
  -- a flat image URL (uploaded file or the design's rendered PNG).
  design_id     uuid references public.designs (id) on delete set null,
  image_url     text,
  scheduled_at  timestamptz not null,
  status        text not null default 'scheduled'
                  check (status in ('draft', 'scheduled', 'posted')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists scheduled_posts_user_time_idx
  on public.scheduled_posts (user_id, scheduled_at);

alter table public.scheduled_posts enable row level security;

-- Owners do everything to their own rows; nobody sees anyone else's.
drop policy if exists "read own scheduled posts" on public.scheduled_posts;
create policy "read own scheduled posts" on public.scheduled_posts
  for select using (user_id = auth.uid());

drop policy if exists "insert own scheduled posts" on public.scheduled_posts;
create policy "insert own scheduled posts" on public.scheduled_posts
  for insert with check (user_id = auth.uid());

drop policy if exists "update own scheduled posts" on public.scheduled_posts;
create policy "update own scheduled posts" on public.scheduled_posts
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "delete own scheduled posts" on public.scheduled_posts;
create policy "delete own scheduled posts" on public.scheduled_posts
  for delete using (user_id = auth.uid());

-- Keep updated_at fresh on every write.
create or replace function public.touch_scheduled_post()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_scheduled_post_update on public.scheduled_posts;
create trigger on_scheduled_post_update
  before update on public.scheduled_posts
  for each row execute function public.touch_scheduled_post();
