-- =====================================================================
-- SC Pronto — starter app catalog
-- Run AFTER schema.sql in the Supabase SQL editor.
-- Safe to re-run: each app is only inserted if its name isn't there yet.
-- =====================================================================

insert into public.apps (name, description, url, icon_emoji, icon_url, kind, sort_order)
select 'Figma', 'Design files and prototypes', 'https://www.figma.com', '🎨', '/icons/figma.svg', 'link', 0
where not exists (select 1 from public.apps where name = 'Figma');

insert into public.apps (name, description, url, icon_emoji, icon_url, kind, sort_order)
select 'Notion', 'Docs, wikis, and notes', 'https://www.notion.so', '📝', '/icons/notion.svg', 'link', 1
where not exists (select 1 from public.apps where name = 'Notion');
