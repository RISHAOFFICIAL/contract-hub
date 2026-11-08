-- ============================================================
-- Contract Hub production schema
-- Run with: supabase db push  (or psql against Supabase Postgres)
-- Migration safe: every statement is idempotent (IF NOT EXISTS,
-- DROP IF EXISTS before CREATE OR REPLACE, ADD COLUMN IF NOT EXISTS).
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- Trigger helper: keep updated_at fresh on every write
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- businesses
-- One row per business. owner_id is the Supabase Auth user who
-- created it. Team access is granted through team_members.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  legal_name text,
  dba text,
  email text,
  phone text,
  city text,
  state text,
  country text DEFAULT 'United States',
  service_area text,
  website text,
  naics_codes text[] NOT NULL DEFAULT '{}',
  product_lines text[] NOT NULL DEFAULT '{}',
  service_lines text[] NOT NULL DEFAULT '{}',
  certifications_summary text,
  -- Plan tier. v1: the app is free and every business gets full access.
  -- 'pro' is reserved for the paid tier coming later. No Stripe in v1.
  plan text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT businesses_plan_check CHECK (plan IN ('free', 'pro'))
);

-- Migration safety for databases created before the plan column existed
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'businesses_plan_check'
  ) THEN
    ALTER TABLE public.businesses
      ADD CONSTRAINT businesses_plan_check CHECK (plan IN ('free', 'pro'));
  END IF;
END
$$;

DROP TRIGGER IF EXISTS businesses_set_updated_at ON public.businesses;
CREATE TRIGGER businesses_set_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Pro billing columns (added November 2026, paywall build)
-- plan is 'free' or 'pro'. grandfathered marks businesses that
-- signed up before the paid plans launched: they keep full access
-- for free. Stripe ids and status are written only by the billing
-- webhook, which uses the service role key.
-- ============================================================
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS grandfathered boolean NOT NULL DEFAULT false;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS subscription_status text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS current_period_end timestamptz;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Grandfather every business created before the paywall go-live
-- (planned November 11, 2026). Safe to re-run: the cutoff is fixed,
-- so businesses created after go-live are never grandfathered here.
-- If go-live moves, move this cutoff date with it.
UPDATE public.businesses
SET grandfathered = true
WHERE grandfathered = false
  AND created_at < '2026-11-11T00:00:00Z';

-- Guard: billing columns can only change from the server (service
-- role). A signed-in user calling Supabase directly cannot set their
-- own plan to pro. The webhook calls with the service role key, where
-- auth.uid() is null, so it is not blocked. The profile editor never
-- touches these columns.
CREATE OR REPLACE FUNCTION public.prevent_billing_column_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (
    OLD.plan IS DISTINCT FROM NEW.plan OR
    OLD.grandfathered IS DISTINCT FROM NEW.grandfathered OR
    OLD.stripe_customer_id IS DISTINCT FROM NEW.stripe_customer_id OR
    OLD.stripe_subscription_id IS DISTINCT FROM NEW.stripe_subscription_id OR
    OLD.subscription_status IS DISTINCT FROM NEW.subscription_status OR
    OLD.current_period_end IS DISTINCT FROM NEW.current_period_end OR
    OLD.trial_ends_at IS DISTINCT FROM NEW.trial_ends_at
  ) THEN
    RAISE EXCEPTION 'Billing fields are managed by Contract Hub, not by the account holder.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS businesses_billing_guard ON public.businesses;
CREATE TRIGGER businesses_billing_guard
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.prevent_billing_column_change();

-- Auto create a blank business row for every new auth user.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.businesses (owner_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- registrations (SAM.gov, state portals, city portals, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  level text NOT NULL DEFAULT 'federal',
  status text NOT NULL DEFAULT 'not_started',
  registration_number text,
  uei text,
  cage text,
  issued_date date,
  expiry_date date,
  renewal_reminder_days int[] NOT NULL DEFAULT '{90,30,7}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT registrations_level_check CHECK (level IN ('federal','state','county','city','institution')),
  CONSTRAINT registrations_status_check CHECK (status IN ('active','inactive','in_progress','not_started','expired'))
);

DROP TRIGGER IF EXISTS registrations_set_updated_at ON public.registrations;
CREATE TRIGGER registrations_set_updated_at
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS registrations_business_id_idx ON public.registrations (business_id);

-- ============================================================
-- certifications (WOSB, HUBZone, DBE, MBE, DBB, other)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  program text NOT NULL DEFAULT 'other',
  status text NOT NULL DEFAULT 'not_started',
  applied_date date,
  approved_date date,
  expiry_date date,
  cert_number text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT certifications_program_check CHECK (program IN ('wosb','edwosb','hubzone','dbe','mbe','dbb','other')),
  CONSTRAINT certifications_status_check CHECK (status IN ('not_started','in_progress','approved','denied','expired'))
);

DROP TRIGGER IF EXISTS certifications_set_updated_at ON public.certifications;
CREATE TRIGGER certifications_set_updated_at
  BEFORE UPDATE ON public.certifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS certifications_business_id_idx ON public.certifications (business_id);

-- ============================================================
-- contracts (the lifecycle: before, during, after award)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title text NOT NULL,
  buyer text,
  buyer_type text,
  stage text NOT NULL DEFAULT 'watching',
  contract_value numeric,
  deadline timestamptz,
  solicitation_number text,
  source_url text,
  naics text,
  set_aside text,
  description text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contracts_stage_check CHECK (stage IN ('watching','preparing','submitted','awarded','in_progress','completed','closed_out','lost'))
);

DROP TRIGGER IF EXISTS contracts_set_updated_at ON public.contracts;
CREATE TRIGGER contracts_set_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS contracts_business_id_idx ON public.contracts (business_id);
CREATE INDEX IF NOT EXISTS contracts_stage_idx ON public.contracts (business_id, stage);
CREATE INDEX IF NOT EXISTS contracts_deadline_idx ON public.contracts (business_id, deadline);

-- ============================================================
-- milestones (per contract)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_date date,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS milestones_set_updated_at ON public.milestones;
CREATE TRIGGER milestones_set_updated_at
  BEFORE UPDATE ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS milestones_contract_id_idx ON public.milestones (contract_id);

-- ============================================================
-- invoices (per contract)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  invoice_number text,
  amount numeric,
  issued_date date,
  due_date date,
  status text NOT NULL DEFAULT 'draft',
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoices_status_check CHECK (status IN ('draft','sent','paid','overdue'))
);

DROP TRIGGER IF EXISTS invoices_set_updated_at ON public.invoices;
CREATE TRIGGER invoices_set_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS invoices_contract_id_idx ON public.invoices (contract_id);

-- ============================================================
-- opportunities (scanned listings from public sources)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title text NOT NULL,
  buyer text,
  source_name text,
  source_url text,
  type text NOT NULL DEFAULT 'active_bid',
  level text,
  location text,
  posted_date date,
  deadline timestamptz,
  naics text,
  set_aside text,
  match_reason text,
  match_score int,
  status text NOT NULL DEFAULT 'new',
  solicitation_number text,
  raw_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunities_type_check CHECK (type IN ('active_bid','upcoming','rfi','sources_sought','presolicitation')),
  CONSTRAINT opportunities_status_check CHECK (status IN ('new','tracked','dismissed'))
);

DROP TRIGGER IF EXISTS opportunities_set_updated_at ON public.opportunities;
CREATE TRIGGER opportunities_set_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS opportunities_business_id_idx ON public.opportunities (business_id);
CREATE INDEX IF NOT EXISTS opportunities_status_idx ON public.opportunities (business_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS opportunities_dedupe_idx
  ON public.opportunities (business_id, source_url, solicitation_number);

-- ============================================================
-- saved_searches
-- ============================================================
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  keywords text,
  levels text[] NOT NULL DEFAULT '{}',
  types text[] NOT NULL DEFAULT '{}',
  state text,
  city text,
  set_asides text[] NOT NULL DEFAULT '{}',
  frequency text NOT NULL DEFAULT 'daily',
  last_run_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saved_searches_frequency_check CHECK (frequency IN ('daily','weekly','manual'))
);

DROP TRIGGER IF EXISTS saved_searches_set_updated_at ON public.saved_searches;
CREATE TRIGGER saved_searches_set_updated_at
  BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS saved_searches_business_id_idx ON public.saved_searches (business_id);

-- ============================================================
-- scan_history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scan_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  saved_search_id uuid REFERENCES public.saved_searches(id) ON DELETE SET NULL,
  run_at timestamptz NOT NULL DEFAULT now(),
  sources_checked jsonb NOT NULL DEFAULT '[]',
  found_count int NOT NULL DEFAULT 0,
  filtered_count int NOT NULL DEFAULT 0,
  added_count int NOT NULL DEFAULT 0,
  per_source jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS scan_history_set_updated_at ON public.scan_history;
CREATE TRIGGER scan_history_set_updated_at
  BEFORE UPDATE ON public.scan_history
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS scan_history_business_id_idx ON public.scan_history (business_id);

-- ============================================================
-- alerts (inbox: opportunities, deadlines, amendments, renewals)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  body text,
  related_id uuid,
  related_table text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT alerts_type_check CHECK (type IN ('opportunity','deadline','amendment','renewal','system'))
);

DROP TRIGGER IF EXISTS alerts_set_updated_at ON public.alerts;
CREATE TRIGGER alerts_set_updated_at
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS alerts_business_id_idx ON public.alerts (business_id);
CREATE INDEX IF NOT EXISTS alerts_unread_idx ON public.alerts (business_id, is_read);

-- ============================================================
-- suppliers (private bench)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  categories text[] NOT NULL DEFAULT '{}',
  outreach_status text NOT NULL DEFAULT 'to_contact',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT suppliers_outreach_check CHECK (outreach_status IN ('to_contact','contacted','quoted','active','declined'))
);

DROP TRIGGER IF EXISTS suppliers_set_updated_at ON public.suppliers;
CREATE TRIGGER suppliers_set_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS suppliers_business_id_idx ON public.suppliers (business_id);

-- ============================================================
-- supplier_quotes (per contract)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.supplier_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  unit_price numeric,
  quantity numeric,
  shipping numeric,
  total_landed numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS supplier_quotes_set_updated_at ON public.supplier_quotes;
CREATE TRIGGER supplier_quotes_set_updated_at
  BEFORE UPDATE ON public.supplier_quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS supplier_quotes_contract_id_idx ON public.supplier_quotes (contract_id);

-- ============================================================
-- contacts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  organization text,
  email text,
  phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS contacts_set_updated_at ON public.contacts;
CREATE TRIGGER contacts_set_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS contacts_business_id_idx ON public.contacts (business_id);

-- ============================================================
-- team_members (roles gate what each person may do)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text,
  email text,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'invited',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_members_role_check CHECK (role IN ('owner','admin','member','viewer')),
  CONSTRAINT team_members_status_check CHECK (status IN ('invited','active'))
);

DROP TRIGGER IF EXISTS team_members_set_updated_at ON public.team_members;
CREATE TRIGGER team_members_set_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS team_members_business_id_idx ON public.team_members (business_id);
CREATE INDEX IF NOT EXISTS team_members_user_id_idx ON public.team_members (user_id);

-- ============================================================
-- vault_documents (checklist only, no file storage yet)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vault_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  status text NOT NULL DEFAULT 'need',
  expiry_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vault_documents_status_check CHECK (status IN ('have','need','expired'))
);

DROP TRIGGER IF EXISTS vault_documents_set_updated_at ON public.vault_documents;
CREATE TRIGGER vault_documents_set_updated_at
  BEFORE UPDATE ON public.vault_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS vault_documents_business_id_idx ON public.vault_documents (business_id);

-- ============================================================
-- compliance_items (proposal workbench, per contract)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.compliance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  requirement text NOT NULL,
  category text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT compliance_items_status_check CHECK (status IN ('pending','met','waived'))
);

DROP TRIGGER IF EXISTS compliance_items_set_updated_at ON public.compliance_items;
CREATE TRIGGER compliance_items_set_updated_at
  BEFORE UPDATE ON public.compliance_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS compliance_items_contract_id_idx ON public.compliance_items (contract_id);

-- ============================================================
-- proposal_sections (proposal workbench, per contract)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.proposal_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS proposal_sections_set_updated_at ON public.proposal_sections;
CREATE TRIGGER proposal_sections_set_updated_at
  BEFORE UPDATE ON public.proposal_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS proposal_sections_contract_id_idx ON public.proposal_sections (contract_id);

-- ============================================================
-- proposal_versions (snapshots, per contract)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.proposal_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  version_number int NOT NULL DEFAULT 1,
  snapshot jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS proposal_versions_set_updated_at ON public.proposal_versions;
CREATE TRIGGER proposal_versions_set_updated_at
  BEFORE UPDATE ON public.proposal_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS proposal_versions_contract_id_idx ON public.proposal_versions (contract_id);

-- ============================================================
-- ads (in app advertising)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  headline text NOT NULL,
  body text,
  category text,
  state text,
  city text,
  cta_text text,
  cta_url text,
  package text NOT NULL DEFAULT 'starter',
  status text NOT NULL DEFAULT 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  click_count int NOT NULL DEFAULT 0,
  report_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ads_package_check CHECK (package IN ('starter','featured','spotlight')),
  CONSTRAINT ads_status_check CHECK (status IN ('draft','pending_review','live','paused'))
);

DROP TRIGGER IF EXISTS ads_set_updated_at ON public.ads;
CREATE TRIGGER ads_set_updated_at
  BEFORE UPDATE ON public.ads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS ads_business_id_idx ON public.ads (business_id);

-- ============================================================
-- badges (13 milestone badges, Bid Ready Journey)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  badge_key text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT badges_unique_per_business UNIQUE (business_id, badge_key)
);

DROP TRIGGER IF EXISTS badges_set_updated_at ON public.badges;
CREATE TRIGGER badges_set_updated_at
  BEFORE UPDATE ON public.badges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS badges_business_id_idx ON public.badges (business_id);

-- ============================================================
-- coach_state (tour and next step coach persistence)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coach_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  tour_completed boolean NOT NULL DEFAULT false,
  snoozed_milestones jsonb NOT NULL DEFAULT '{}',
  dismissed_milestones text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coach_state_one_per_business UNIQUE (business_id)
);

DROP TRIGGER IF EXISTS coach_state_set_updated_at ON public.coach_state;
CREATE TRIGGER coach_state_set_updated_at
  BEFORE UPDATE ON public.coach_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- foundation_progress (Business Foundations lessons)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.foundation_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  lesson_key text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT foundation_progress_unique_per_business UNIQUE (business_id, lesson_key)
);

DROP TRIGGER IF EXISTS foundation_progress_set_updated_at ON public.foundation_progress;
CREATE TRIGGER foundation_progress_set_updated_at
  BEFORE UPDATE ON public.foundation_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS foundation_progress_business_id_idx ON public.foundation_progress (business_id);

-- ============================================================
-- reminders (deadline and renewal reminders)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  due_at timestamptz,
  related_table text,
  related_id uuid,
  channels text[] NOT NULL DEFAULT '{in_app}',
  is_done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS reminders_set_updated_at ON public.reminders;
CREATE TRIGGER reminders_set_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS reminders_business_id_idx ON public.reminders (business_id);
CREATE INDEX IF NOT EXISTS reminders_due_idx ON public.reminders (business_id, due_at);
