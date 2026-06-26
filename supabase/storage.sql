-- =====================================================================
-- SC Pronto — Social Studio image storage
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).
-- Safe to re-run.
--
-- Uploaded images live in a public bucket and are referenced by URL from a
-- design's saved JSON (so design rows stay small). Each user uploads into a
-- folder named after their auth uid: "<uid>/<uuid>.<ext>".
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('design-images', 'design-images', true)
on conflict (id) do update set public = true;

-- Authenticated users may upload only into their own folder.
drop policy if exists "Upload own design images" on storage.objects;
create policy "Upload own design images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'design-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anyone may read (bucket is public; shared collaborators must load images).
drop policy if exists "Public read design images" on storage.objects;
create policy "Public read design images" on storage.objects
  for select to public
  using (bucket_id = 'design-images');

-- Users may delete only their own uploads.
drop policy if exists "Delete own design images" on storage.objects;
create policy "Delete own design images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'design-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
