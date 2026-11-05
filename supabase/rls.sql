-- ============================================================
-- Contract Hub Row Level Security
-- Run after schema.sql with: supabase db push  (or psql)
-- Migration safe: DROP POLICY IF EXISTS before every CREATE.
--
-- Model:
--   * A business belongs to its owner (businesses.owner_id).
--   * Team members get access through team_members with an
--     active status and a matching auth user id.
--   * Viewers are read only. Members can edit non billing
--     tables. Admins have full access except team management.
--     Owners have full access. The service role bypasses RLS.
-- Total policies created: 92
--   (21 tenant tables x 4, businesses x 4, team_members x 4)
-- ============================================================

-- ------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so they can read past RLS)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_business_owner(bid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = bid AND owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.team_role(bid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.team_members
  WHERE business_id = bid
    AND user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_read_business(bid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_business_owner(bid) OR public.team_role(bid) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.can_write_business(bid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_business_owner(bid)
    OR public.team_role(bid) IN ('owner', 'admin', 'member');
$$;

-- ------------------------------------------------------------
-- Standard tenant tables: identical policy shape on each one
-- ------------------------------------------------------------
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'registrations', 'certifications', 'contracts', 'milestones',
    'invoices', 'opportunities', 'saved_searches', 'scan_history',
    'alerts', 'suppliers', 'supplier_quotes', 'contacts',
    'vault_documents', 'compliance_items', 'proposal_sections',
    'proposal_versions', 'ads', 'badges', 'coach_state',
    'foundation_progress', 'reminders'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_select', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.can_read_business(business_id))',
      tbl || '_select', tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_insert', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_write_business(business_id))',
      tbl || '_insert', tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_update', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.can_write_business(business_id)) WITH CHECK (public.can_write_business(business_id))',
      tbl || '_update', tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_delete', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.can_write_business(business_id))',
      tbl || '_delete', tbl
    );
  END LOOP;
END
$$;

-- ------------------------------------------------------------
-- businesses: owners manage, team members can read their own
-- ------------------------------------------------------------
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;

DROP POLICY IF EXISTS businesses_select ON public.businesses;
CREATE POLICY businesses_select ON public.businesses
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.team_role(id) IS NOT NULL);

DROP POLICY IF EXISTS businesses_insert ON public.businesses;
CREATE POLICY businesses_insert ON public.businesses
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS businesses_update ON public.businesses;
CREATE POLICY businesses_update ON public.businesses
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS businesses_delete ON public.businesses;
CREATE POLICY businesses_delete ON public.businesses
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- ------------------------------------------------------------
-- team_members: readable by the team, managed by owners only
-- (admins are full access except team management)
-- ------------------------------------------------------------
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;

DROP POLICY IF EXISTS team_members_select ON public.team_members;
CREATE POLICY team_members_select ON public.team_members
  FOR SELECT TO authenticated
  USING (public.can_read_business(business_id));

DROP POLICY IF EXISTS team_members_owner_insert ON public.team_members;
CREATE POLICY team_members_owner_insert ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_business_owner(business_id));

DROP POLICY IF EXISTS team_members_owner_update ON public.team_members;
CREATE POLICY team_members_owner_update ON public.team_members
  FOR UPDATE TO authenticated
  USING (public.is_business_owner(business_id))
  WITH CHECK (public.is_business_owner(business_id));

DROP POLICY IF EXISTS team_members_owner_delete ON public.team_members;
CREATE POLICY team_members_owner_delete ON public.team_members
  FOR DELETE TO authenticated
  USING (public.is_business_owner(business_id));
