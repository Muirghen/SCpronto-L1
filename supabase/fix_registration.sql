-- =====================================================================
-- Fix: registration fails with "Database error saving new user".
--
-- Cause: the new-user trigger sets a user's status to 'pending', but the
-- 'pending' value never got added to the user_status enum (Postgres won't let
-- a new enum value be ADDED and USED in the same transaction, and Supabase
-- runs a whole script as one transaction).
--
-- HOW TO RUN: run STEP 1 on its own first (select just that line and run it),
-- then run STEP 2. Both are safe to re-run.
-- =====================================================================

-- STEP 1 — run this line by itself first:
alter type user_status add value if not exists 'pending';

-- STEP 2 — run this after step 1 succeeds:
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
  if lower(split_part(new.email, '@', 2)) <> allowed_domain then
    raise exception 'Only @% email addresses may register.', allowed_domain;
  end if;

  is_first_admin := lower(new.email) = first_admin;

  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when is_first_admin then 'admin'::user_role else 'employee'::user_role end,
    case when is_first_admin then 'active'::user_status else 'pending'::user_status end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
