-- TeamWallet RLS Policies ohne Rekursion
-- Profiles: Alle sichtbar, User bearbeitet eigenes
-- Teams: Mitglieder sehen ihre Teams
-- Memberships: Mitglieder sehen andere im Team
-- Weitere Tabellen: Team-Mitgliedschafts-Check

-- ==================== PROFILES ====================
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);


-- ==================== TEAMS ====================
DROP POLICY IF EXISTS "teams_select" ON public.teams;
DROP POLICY IF EXISTS "teams_insert" ON public.teams;
DROP POLICY IF EXISTS "teams_update" ON public.teams;
DROP POLICY IF EXISTS "teams_delete" ON public.teams;

CREATE POLICY "teams_select" ON public.teams
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.team_id = teams.id
      AND memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "teams_insert" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "teams_update" ON public.teams
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.team_id = teams.id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('admin', 'vice_admin')
    )
  );

CREATE POLICY "teams_delete" ON public.teams
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());


-- ==================== MEMBERSHIPS ====================
DROP POLICY IF EXISTS "memberships_select" ON public.memberships;
DROP POLICY IF EXISTS "memberships_insert" ON public.memberships;
DROP POLICY IF EXISTS "memberships_update" ON public.memberships;
DROP POLICY IF EXISTS "memberships_delete" ON public.memberships;

CREATE POLICY "memberships_select" ON public.memberships
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.memberships AS my_membership
      WHERE my_membership.team_id = memberships.team_id
      AND my_membership.user_id = auth.uid()
    )
  );

CREATE POLICY "memberships_insert" ON public.memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = memberships.team_id
      AND (
        teams.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.memberships AS admin_check
          WHERE admin_check.team_id = memberships.team_id
          AND admin_check.user_id = auth.uid()
          AND admin_check.role IN ('admin', 'vice_admin')
        )
      )
    )
  );

CREATE POLICY "memberships_update" ON public.memberships
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = memberships.team_id
      AND (
        teams.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.memberships AS admin_check
          WHERE admin_check.team_id = memberships.team_id
          AND admin_check.user_id = auth.uid()
          AND admin_check.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "memberships_delete" ON public.memberships
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = memberships.team_id
      AND (
        teams.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.memberships AS admin_check
          WHERE admin_check.team_id = memberships.team_id
          AND admin_check.user_id = auth.uid()
          AND admin_check.role IN ('admin', 'vice_admin')
        )
      )
    )
  );


-- ==================== PENALTY CATALOG ====================
DROP POLICY IF EXISTS "penalty_catalog_select" ON public.penalty_catalog;
DROP POLICY IF EXISTS "penalty_catalog_insert" ON public.penalty_catalog;
DROP POLICY IF EXISTS "penalty_catalog_update" ON public.penalty_catalog;
DROP POLICY IF EXISTS "penalty_catalog_delete" ON public.penalty_catalog;

CREATE POLICY "penalty_catalog_select" ON public.penalty_catalog
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.team_id = penalty_catalog.team_id
      AND memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "penalty_catalog_insert" ON public.penalty_catalog
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.team_id = penalty_catalog.team_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('admin', 'vice_admin')
    )
  );

CREATE POLICY "penalty_catalog_update" ON public.penalty_catalog
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.team_id = penalty_catalog.team_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('admin', 'vice_admin')
    )
  );

CREATE POLICY "penalty_catalog_delete" ON public.penalty_catalog
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.team_id = penalty_catalog.team_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('admin', 'vice_admin')
    )
  );


-- ==================== PENALTIES ====================
DROP POLICY IF EXISTS "penalties_select" ON public.penalties;
DROP POLICY IF EXISTS "penalties_insert" ON public.penalties;
DROP POLICY IF EXISTS "penalties_update" ON public.penalties;
DROP POLICY IF EXISTS "penalties_delete" ON public.penalties;

CREATE POLICY "penalties_select" ON public.penalties
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.team_id = penalties.team_id
      AND memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "penalties_insert" ON public.penalties
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.team_id = penalties.team_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('admin', 'vice_admin')
    )
  );

CREATE POLICY "penalties_update" ON public.penalties
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.team_id = penalties.team_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('admin', 'vice_admin')
    )
  );

CREATE POLICY "penalties_delete" ON public.penalties
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.team_id = penalties.team_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('admin', 'vice_admin')
    )
  );


-- ==================== TRANSACTIONS ====================
DROP POLICY IF EXISTS "transactions_select" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert" ON public.transactions;

CREATE POLICY "transactions_select" ON public.transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.team_id = transactions.team_id
      AND memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "transactions_insert" ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.team_id = transactions.team_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('admin', 'vice_admin')
    )
  );


-- ==================== EXPENSES ====================
DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;

CREATE POLICY "expenses_select" ON public.expenses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.team_id = expenses.team_id
      AND memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "expenses_insert" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.team_id = expenses.team_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('admin', 'vice_admin')
    )
  );


-- ==================== TEAM INVITES ====================
DROP POLICY IF EXISTS "team_invites_select" ON public.team_invites;
DROP POLICY IF EXISTS "team_invites_insert" ON public.team_invites;
DROP POLICY IF EXISTS "team_invites_delete" ON public.team_invites;

CREATE POLICY "team_invites_select" ON public.team_invites
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.team_id = team_invites.team_id
      AND memberships.user_id = auth.uid()
    ) OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "team_invites_insert" ON public.team_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.team_id = team_invites.team_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('admin', 'vice_admin')
    )
  );

CREATE POLICY "team_invites_delete" ON public.team_invites
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.team_id = team_invites.team_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('admin', 'vice_admin')
    )
  );


-- ==================== NOTIFICATIONS ====================
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
