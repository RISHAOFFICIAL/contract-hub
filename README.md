# Contract Hub (production)

Contract tracking and opportunity finder for small business owners pursuing
government contracts. Tracks contracts before, during, and after award, scans
official public sources for new opportunities every day, and guides owners
from their first registration to their first win.

This repo is the production rebuild (Next.js 14 App Router, TypeScript,
Supabase) of the working Contract Hub preview. Foundation only: auth, data
model, row level security, app shell, dashboard, and the daily scan cron
stub. Feature builds land in later phases.

## Stack

- Next.js 14 App Router, React 18, TypeScript (strict)
- Tailwind CSS 3 with a custom luxury theme (warm ivory, deep forest, brass,
  serif display headings, Liquid Glass surfaces)
- Supabase: Postgres, Auth (email/password plus magic link), Row Level
  Security on every table
- Vercel hosting with a daily cron job

## Setup

### 1. Create the Supabase project

Create a project at https://supabase.com/dashboard, then open the SQL editor
and run, in order:

1. `supabase/schema.sql` (tables, triggers, the new user signup trigger)
2. `supabase/rls.sql` (helper functions plus 92 RLS policies)

Both files are idempotent and safe to re-run.

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard, Project Settings, Data API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard, Project Settings, API Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard, Project Settings, API Keys (server only, never commit) |
| `CRON_SECRET` | Any long random string, also set in Vercel env vars |

In Supabase Auth settings, set the Site URL to your Vercel URL and add it
to Redirect URLs so magic links and signup confirmations return to
`/auth/callback`.

### 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Sign up creates your account and a blank
business row automatically (database trigger on `auth.users`).

### 4. Deploy on Vercel

```bash
vercel
```

Add the four environment variables in Vercel, Project Settings,
Environment Variables. The `vercel.json` cron runs
`GET /api/cron/daily-scan` daily at 12:15 UTC (07:15 America/Detroit in
standard time). Vercel sends the cron with an Authorization header only on
paid plans; the route also accepts the shared `CRON_SECRET` bearer token.

## Architecture

```
src/
  app/
    page.tsx                 Public landing page
    login/page.tsx           Email/password plus magic link sign in
    signup/page.tsx          Account creation
    auth/callback/route.ts   Magic link and signup code exchange
    auth/signout/route.ts    Sign out
    app/
      layout.tsx             Session check, renders AppShell
      page.tsx               Dashboard (real data, empty states)
      plan/page.tsx          Plan screen (Free now, Pro coming later)
    api/cron/daily-scan/     Daily scan cron stub (CRON_SECRET guarded)
  components/
    AppShell.tsx             Authenticated shell, More sheet state
    TabBar.tsx               Glass bottom tab bar (Dashboard, Contracts,
                             Opportunities, Guide, More)
    MoreSheet.tsx            Sheet listing the remaining sections
  lib/supabase/
    client.ts                Browser client
    server.ts                Server client (cookies)
    middleware.ts            Session refresh helper
  middleware.ts              Protects /app/*, redirects to /login
supabase/
  schema.sql                 22 tables, triggers, signup hook
  rls.sql                    RLS helpers and 92 policies
vercel.json                  Daily cron at 12:15 UTC
```

### Data isolation

Every tenant table carries `business_id`. RLS policies let an
authenticated user touch a row only when they own the business
(`businesses.owner_id = auth.uid()`) or hold an active `team_members`
row for it. Roles: viewers read only, members edit non billing tables,
admins have full access except team management, owners have full access.
The service role bypasses RLS for server jobs.

### Theme

`tailwind.config.ts` defines the palette (ivory, forest, brass, ink),
the display and sans font families, and card shadows. `globals.css`
adds the Liquid Glass utilities (`.glass`, `.glass-forest`,
`.glass-brass`), glass buttons, status pills, the readiness meter, and
the brass divider. No em dashes in any copy, per the owner rule.

## Feature roadmap (not yet built)

Foundation is done. These ship in later phases:

- Contract tracker screens (list, detail, lifecycle moves)
- Opportunity screens (scan results, saved searches, Track this)
- Guide chatbot with Business Foundations lessons (EIN, UEI/SAM,
  business credit tiers)
- Live scan worker (SAM.gov plus official state, county, city, school,
  and hospital sources) behind `/api/cron/daily-scan`
- Proposal workbench (compliance matrix, solicitation analyzer,
  proposal builder, supplier quotes, margin calculator)
- 13 badge Bid Ready Journey rewards system
- Talk to update: voice and typed agent commands on contract cards
- Ads section (browse plus advertiser packages)
- Team management screens
- Capability statement generator
- Billing and subscriptions (deferred). Contract Hub is free for now and
  every business defaults to full access on the `free` plan. The `plan`
  column exists on `businesses` for the future Pro tier, and a Stripe
  product for Contract Hub Pro already exists, but nothing is wired to
  Stripe in v1. No checkout, no paywall.
- Email and push notifications
- Document vault with real file storage (currently checklist only)
- Native iOS and Android packaging

## Security notes

- No secrets are committed. `.env.local` is git ignored.
- The app never asks for or stores government portal passwords,
  banking logins, or card numbers. The Guide warns if a password-like
  value is typed.
- Copy across the app states plainly that guidance is general
  information, not legal advice.
