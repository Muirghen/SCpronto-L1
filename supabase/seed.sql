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

insert into public.apps (name, description, url, icon_emoji, icon_url, kind, sort_order)
select 'GitHub', 'Code, issues, and pull requests', 'https://github.com', '🐙', '/icons/github.svg', 'link', 2
where not exists (select 1 from public.apps where name = 'GitHub');

insert into public.apps (name, description, url, icon_emoji, icon_url, kind, sort_order)
select 'Vercel', 'Deployments and hosting', 'https://vercel.com', '▲', '/icons/vercel.svg', 'link', 3
where not exists (select 1 from public.apps where name = 'Vercel');

insert into public.apps (name, description, url, icon_emoji, icon_url, kind, sort_order)
select 'Supabase', 'Database, auth, and storage', 'https://supabase.com', '⚡', '/icons/supabase.svg', 'link', 4
where not exists (select 1 from public.apps where name = 'Supabase');

insert into public.apps (name, description, url, icon_emoji, icon_url, kind, sort_order)
select 'Claude', 'AI assistant by Anthropic', 'https://claude.ai', '✦', '/icons/claude.svg', 'link', 5
where not exists (select 1 from public.apps where name = 'Claude');
