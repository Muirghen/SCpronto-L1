-- =====================================================================
-- SC Pronto — in-app notifications
-- Run AFTER schema.sql + accounts.sql in the Supabase SQL editor.
-- Safe to re-run.
--
-- Each notification belongs to one recipient (user_id). RLS makes sure a
-- person can only ever read/modify their OWN notifications. Rows are created
-- by security-definer triggers (never directly by users), so a user can't
-- create notifications for anyone else.
-- =====================================================================

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  type        text not null default 'info',
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Recipients can read / mark / delete only their own notifications.
drop policy if exists "read own notifications" on public.notifications;
create policy "read own notifications" on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists "update own notifications" on public.notifications;
create policy "update own notifications" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "delete own notifications" on public.notifications;
create policy "delete own notifications" on public.notifications
  for delete using (user_id = auth.uid());
-- (No insert policy: only the triggers below create notifications.)

-- ---------------------------------------------------------------------
-- When a new pending profile appears, notify every active admin.
-- ---------------------------------------------------------------------
create or replace function public.notify_admins_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' then
    insert into public.notifications (user_id, type, title, body, link)
    select p.id,
           'approval',
           'New account pending',
           coalesce(nullif(new.full_name, ''), new.email) || ' is waiting for approval.',
           '/admin'
    from public.profiles p
    where p.role = 'admin' and p.status = 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_pending on public.profiles;
create trigger on_profile_pending
  after insert on public.profiles
  for each row execute function public.notify_admins_pending();

-- ---------------------------------------------------------------------
-- When an admin approves a pending user, notify that user.
-- ---------------------------------------------------------------------
create or replace function public.notify_user_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'pending' and new.status = 'active' then
    insert into public.notifications (user_id, type, title, body, link)
    values (new.id, 'approved', 'You''re approved!',
            'Your account has been approved — welcome to SC Pronto.', '/apps');
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_approved on public.profiles;
create trigger on_profile_approved
  after update on public.profiles
  for each row execute function public.notify_user_approved();
