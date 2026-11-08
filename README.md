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
| `STRIPE_SECRET_KEY` | Stripe Dashboard, Developers, API keys (server only, never commit) |
| `STRIPE_PRICE_ID_PRO_MONTHLY` | Stripe Dashboard, Products, Pro Monthly price id (`price_...`) |
| `STRIPE_PRICE_ID_PRO_ANNUAL` | Stripe Dashboard, Products, Pro Annual price id (`price_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard, Developers, Webhooks, endpoint signing secret (`whsec_...`) |
| `NEXT_PUBLIC_APP_URL` | Public app URL, used for Stripe Checkout return links |

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

## Billing (Pro paywall)

Free tracks up to 3 contracts. Pro is $24 a month or $240 a year, with a
7-day free trial, and unlocks unlimited tracking, alerts on new matches,
saved searches, and the document vault. Early members are grandfathered:
businesses created before the paywall go-live (November 11, 2026) keep
full access for free.

### Owner setup (Stripe dashboard)

1. Create two recurring prices in Stripe Dashboard, Products: Pro
   Monthly ($24/month) and Pro Annual ($240/year). Paste the price ids
   into `STRIPE_PRICE_ID_PRO_MONTHLY` and `STRIPE_PRICE_ID_PRO_ANNUAL`.
2. Add a webhook endpoint for `https://contract-hub-mu.vercel.app/api/billing/webhook`
   listening for `checkout.session.completed`,
   `customer.subscription.created`, `customer.subscription.updated`, and
   `customer.subscription.deleted`. Paste the signing secret into
   `STRIPE_WEBHOOK_SECRET`.
3. Enable the customer portal in Stripe Dashboard, Settings, Billing,
   Customer portal, so Pro members can manage billing from the Plan page.
4. Set `STRIPE_SECRET_KEY` (test key while testing, live key at go-live)
   in Vercel, Project Settings, Environment Variables.
5. Re-run `supabase/schema.sql` in the Supabase SQL editor. It adds the
   billing columns, grandfathers pre-launch businesses, and adds a
   trigger that stops account holders from changing their own plan.

### How it works

- `src/lib/billing.ts` reads the business plan and enforces the
  3-contract Free cap. `src/lib/stripe.ts` holds the Stripe client.
- `src/app/app/plan/actions.ts` starts Stripe Checkout (subscription
  with a 7-day trial) and opens the customer portal.
- `src/app/api/billing/webhook/route.ts` verifies the Stripe signature
  and syncs subscription status into `businesses.plan`. Only the
  webhook, using the service role key, can change billing columns.
- Gating lives in the server actions: creating a contract and tracking
  an opportunity check the cap, creating a saved search requires Pro,
  and new-match alerts are only written for Pro and grandfathered
  businesses.

### Testing (no real charges)

Use Stripe test mode: test secret key, test price ids, and the Stripe
CLI (`stripe listen --forward-to localhost:3000/api/billing/webhook`)
to forward webhook events locally. Test card `4242 4242 4242 4242`,
any future expiry, any CVC. A test checkout creates a trialing
subscription; the webhook flips the business to Pro; cancel in the
portal to watch it flip back to Free.

### Still stubbed

- Document vault file uploads: the vault is still a checklist. Uploads
  need a Supabase Storage bucket, upload UI, and storage policies.
  The Plan and Vault pages say so plainly.
- Email alerts: new-match alerts are in-app rows only. Email delivery
  needs a mail provider (for example Resend) and a sending worker.

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
- Billing and subscriptions (Pro paywall, branch `feature/pro-paywall`).
  Free tracks up to 3 contracts; Pro is $24/month or $240/year with a
  7-day free trial, wired to Stripe Checkout and webhooks. Early members
  are grandfathered. See "Billing (Pro paywall)" above.
- Email and push notifications
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
