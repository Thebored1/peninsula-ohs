-- =============================================================
-- MODULE 5: Row Level Security — CAPA / Actions
-- =============================================================
-- Access matrix:
--
--   actions
--     Worker        → SELECT own (assigned or created); INSERT standalone
--     Supervisor    → SELECT/UPDATE all at accessible sites; INSERT for their sites
--     HSE Officer   → Full org access
--     Executive     → SELECT only (read-only dashboard)
--     System Admin  → Full access
--
--   action_comments
--     Anyone who can SELECT the action can INSERT a comment.
--     No UPDATE/DELETE (immutable per append-only rules).
--
--   action_evidence
--     Assignee and action-visible users can INSERT evidence.
--     Admin can delete.
--
--   action_extensions
--     Assignee of the action can INSERT (request).
--     Supervisor / HSE Officer can UPDATE (approve/reject).
--     Anyone who can see the action can read its extensions.
--
--   action_assignments
--     Read-only for anyone who can see the action.
--     Written only by SECURITY DEFINER trigger functions.
-- =============================================================

-- Helper: returns true if the current user can view this action
-- (i.e., is the assignee, created it, or has elevated access at its site).
CREATE OR REPLACE FUNCTION can_access_action(p_action_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM actions a
    WHERE a.id = p_action_id
      AND (
        a.assigned_to               = auth.uid()
        OR a.created_by             = auth.uid()
        OR a.verification_assigned_to = auth.uid()
        OR (a.organisation_id = get_my_organisation_id()
            AND (is_system_admin() OR is_hse_officer() OR is_executive()
                 OR (is_supervisor() AND (a.site_id IS NULL OR can_access_site(a.site_id)))))
      )
  );
$$;

-- =============================================================
-- ENABLE RLS
-- =============================================================

ALTER TABLE actions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_evidence    ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_extensions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_assignments ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- ACTIONS
-- =============================================================

-- Assignee, creator, and verifier see their own actions
CREATE POLICY "act_select_own" ON actions FOR SELECT
  USING (
    assigned_to               = auth.uid()
    OR created_by             = auth.uid()
    OR verification_assigned_to = auth.uid()
  );

-- Supervisor: all actions at their accessible sites
CREATE POLICY "act_select_supervisor" ON actions FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND is_supervisor()
    AND (site_id IS NULL OR can_access_site(site_id))
  );

-- HSE Officer / Executive / System Admin: full org read
CREATE POLICY "act_select_elevated" ON actions FOR SELECT
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer() OR is_executive())
  );

-- Any org member can create a standalone or source-linked action
CREATE POLICY "act_insert" ON actions FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (
      source_type = 'standalone'                  -- anyone can create standalone
      OR is_supervisor()
      OR is_hse_officer()
      OR is_system_admin()
    )
  );

-- Assignee can update their own non-terminal actions
CREATE POLICY "act_update_own" ON actions FOR UPDATE
  USING (
    assigned_to = auth.uid()
    AND status NOT IN ('verified', 'closed', 'cancelled')
  );

-- Verifier can update verification fields
CREATE POLICY "act_update_verifier" ON actions FOR UPDATE
  USING (
    verification_assigned_to = auth.uid()
    AND status IN ('completed', 'verification_pending')
  );

-- Supervisor: update all actions at their accessible sites
CREATE POLICY "act_update_supervisor" ON actions FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_supervisor()
    AND (site_id IS NULL OR can_access_site(site_id))
  );

-- HSE Officer / Admin: full org update
CREATE POLICY "act_update_elevated" ON actions FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND (is_system_admin() OR is_hse_officer())
  );

-- Only System Admin can delete (soft-cancel is the preferred path)
CREATE POLICY "act_delete" ON actions FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

-- =============================================================
-- ACTION COMMENTS
-- =============================================================

-- Anyone who can see the action can read its comments
CREATE POLICY "ac_select" ON action_comments FOR SELECT
  USING (can_access_action(action_id));

-- Anyone who can see the action can add a comment
CREATE POLICY "ac_insert" ON action_comments FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND can_access_action(action_id)
  );

-- =============================================================
-- ACTION EVIDENCE
-- =============================================================

CREATE POLICY "aev_select" ON action_evidence FOR SELECT
  USING (can_access_action(action_id));

-- Assignee, supervisor, HSE Officer can upload evidence
CREATE POLICY "aev_insert" ON action_evidence FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND (
      can_access_action(action_id)
      AND (
        EXISTS (SELECT 1 FROM actions WHERE id = action_id AND assigned_to = auth.uid())
        OR is_supervisor()
        OR is_hse_officer()
        OR is_system_admin()
      )
    )
  );

-- Only admin can delete evidence
CREATE POLICY "aev_delete" ON action_evidence FOR DELETE
  USING (
    organisation_id = get_my_organisation_id()
    AND is_system_admin()
  );

-- =============================================================
-- ACTION EXTENSIONS
-- =============================================================

-- Anyone who can see the action can read its extensions
CREATE POLICY "aex_select" ON action_extensions FOR SELECT
  USING (can_access_action(action_id));

-- Only the current assignee can submit an extension request
CREATE POLICY "aex_insert" ON action_extensions FOR INSERT
  WITH CHECK (
    organisation_id = get_my_organisation_id()
    AND EXISTS (
      SELECT 1 FROM actions a
      WHERE a.id = action_id
        AND a.assigned_to = auth.uid()
        AND a.status NOT IN ('verified','closed','cancelled')
    )
    -- Prevent duplicate pending requests
    AND NOT EXISTS (
      SELECT 1 FROM action_extensions ae
      WHERE ae.action_id = action_id AND ae.status = 'pending'
    )
  );

-- Supervisor / HSE Officer / Admin can approve or reject
CREATE POLICY "aex_update" ON action_extensions FOR UPDATE
  USING (
    organisation_id = get_my_organisation_id()
    AND status = 'pending'
    AND (
      is_system_admin()
      OR is_hse_officer()
      OR (is_supervisor() AND can_access_action(action_id))
    )
  );

-- =============================================================
-- ACTION ASSIGNMENTS (history log — read only for users)
-- =============================================================

CREATE POLICY "aas_select" ON action_assignments FOR SELECT
  USING (can_access_action(action_id));

-- SECURITY DEFINER triggers handle all inserts; no user INSERT policy
