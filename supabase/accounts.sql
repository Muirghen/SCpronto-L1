-- =====================================================================
-- SC Pronto — accounts: admin approval + avatars
-- Run this AFTER schema.sql in the Supabase SQL editor. Safe to re-run.
-- If the ALTER TYPE line errors about being used in the same transaction,
-- run just that line on its own first, then run the rest.
-- =====================================================================

-- New sign-ups wait for an admin: add a 'pending' status.
alter type user_status add value if not exists 'pending';

-- Profile avatar (null = show the user's initial).
alter table public.profiles add column if not exists avatar_url text;

-- New users register as pending employees; the designated first admin is
-- auto-approved so the portal is never locked out.
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

-- ---------------------------------------------------------------------
-- Avatars storage: public bucket, each user writes only their own folder
-- ("<uid>/<file>"), everyone can read.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Upload own avatar" on storage.objects;
create policy "Upload own avatar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Update own avatar" on storage.objects;
create policy "Update own avatar" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Public read avatars" on storage.objects;
create policy "Public read avatars" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

drop policy if exists "Delete own avatar" on storage.objects;
create policy "Delete own avatar" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
