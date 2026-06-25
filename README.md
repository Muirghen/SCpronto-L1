# SC Pronto — Employee Portal

Internal portal where SC Pronto employees register, sign in, and reach the apps
and tools they're given access to. Admins can appoint other admins, disable
accounts, and manage the app catalog.

Built with **Next.js (App Router) + Supabase + Tailwind**, deployable free on
**Vercel + Supabase**.

## Features

- **Register / Login** — restricted to `@scpronto.com` email addresses.
- **Roles** — `employee` and `admin`, enforced in the database with Row Level
  Security (not just hidden in the UI).
- **First admin** — `fabio@scpronto.com` is auto-promoted to admin on signup.
  Any admin can promote/demote others from the Admin page.
- **Apps page** — grid of tiles. Two kinds: **external links** and **embedded
  tools** (hosted under `/tools/[id]`).
- **Admin page** — manage people (make/revoke admin, disable/enable) and the
  app catalog (add/remove tiles).

## Brand

SC Pronto "Warm Monochrome / Industrial" palette (see `tailwind.config.ts`):
espresso `#3A1A0E`, cream `#FBF4E8`, logo orange `#D85A30`, plus on-light /
on-dark / tan accents. UI font **Inter**, serif wordmark **Spectral**.

> **Logo:** drop the real 3D knot render at `public/logo.png`. Until then a flat
> SVG (`public/logo.svg`) is used as a fallback automatically.

## Setup

### 1. Create a Supabase project (free)

1. Go to <https://supabase.com> → New project.
2. Open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the
   `profiles` and `apps` tables, the role/domain triggers, and RLS policies.
3. **Auth settings:** under Authentication → Providers → Email, decide whether
   to require email confirmation. For the redirect, add your deployed URL +
   `/auth/callback` to the allowed redirect URLs.

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
Supabase → Project Settings → API.

### 3. Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Register `fabio@scpronto.com` first — you'll land
on the portal as an admin.

## Deploy (free)

1. Push this repo to GitHub.
2. Import it at <https://vercel.com> → New Project.
3. Add the same three env vars in Vercel's project settings.
4. Deploy. Then add `https://YOUR-APP.vercel.app/auth/callback` to Supabase's
   allowed redirect URLs.

## Changing the allowed domain or first admin

- **Domain:** set `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN` (app-side check) **and**
  update `allowed_domain` in the `handle_new_user()` function in
  `supabase/schema.sql` (DB-side enforcement).
- **First admin:** update `first_admin` in the same function, or just promote
  anyone from the Admin page once you're in.
