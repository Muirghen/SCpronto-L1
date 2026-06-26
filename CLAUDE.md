# SCpronto-L1 — project notes for Claude

Next.js (App Router) + Supabase + Tailwind. The "Social Studio" graphic editor
lives in `src/components/StudioEditor.tsx` with helpers in
`src/lib/studio/templates.ts` and icons in `src/components/studio/Icon.tsx`.

## Deployment

This app auto-deploys via **Vercel connected to GitHub**. Vercel's production
branch is **`claude/other-section-default-wihq6d`** (the repo's default branch;
there is no `main`). Pushing a commit to that branch triggers a production
deploy.

**Standing instruction from the user (2026-06): after completing and pushing a
change, also deploy it** — i.e. fast-forward / push the same commit to the
production branch `claude/other-section-default-wihq6d`. The user has
pre-authorized this, so you don't need to ask each time; just do it once the
work is committed and pushed to the feature branch, and tell them it's been
pushed to production. If the fast-forward isn't clean (the prod branch has
diverged), stop and ask before forcing anything.

Note: deploy status/URL can't be observed from the sandbox (no Vercel token
here) — confirm the git push only, and point the user to their Vercel dashboard
for build status.

## Verifying the Studio UI locally

`/studio` requires Supabase auth, so to screenshot the editor without
credentials: set placeholder `NEXT_PUBLIC_SUPABASE_*` in `.env.local`, add a
temporary public preview route that renders `<StudioEditor>` with mock props
(and add its path to `PUBLIC_PATHS` in `src/lib/supabase/middleware.ts`), run
`npm run dev`, screenshot with Playwright (`playwright-core` + the pre-installed
Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`), then revert
all the temp scaffolding. Don't commit any of it.
