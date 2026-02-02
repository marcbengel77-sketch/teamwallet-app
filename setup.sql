
-- 1. Zuerst alle alten Policies und Funktionen entfernen, um einen sauberen Stand zu haben
DROP POLICY IF EXISTS "memberships_select" ON public.memberships;
DROP POLICY IF EXISTS "memberships_insert" ON public.memberships;
DROP POLICY IF EXISTS "memberships_admin_manage" ON public.memberships;
DROP POLICY IF EXISTS "penalties_select" ON public.penalties;
DROP POLICY IF EXISTS "penalties_admin_manage" ON public.penalties;
DROP POLICY IF EXISTS "teams_select" ON public.teams;
DROP POLICY IF EXISTS "teams_insert" ON public.teams;
DROP POLICY IF EXISTS "teams_admin_update" ON public.teams;

-- 2. Hilfsfunktionen mit SECURITY DEFINER (umgeht RLS intern)
-- WICHTIG: search_path muss gesetzt sein für SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_team_member(_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE team_id = _team_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_team_admin(_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE team_id = _team_id 
    AND user_id = auth.uid() 
    AND (role = 'admin' OR role = 'vice_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Policies für TEAMS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teams_select_policy" ON public.teams 
  FOR SELECT USING (public.is_team_member(id) OR created_by = auth.uid());

CREATE POLICY "teams_insert_policy" ON public.teams 
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "teams_update_policy" ON public.teams 
  FOR UPDATE USING (public.is_team_admin(id));

-- 4. Policies für MEMBERSHIPS
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "memberships_select_policy" ON public.memberships 
  FOR SELECT USING (team_id IN (SELECT t.id FROM public.teams t) OR user_id = auth.uid());

CREATE POLICY "memberships_insert_policy" ON public.memberships 
  FOR INSERT WITH CHECK (
    -- Entweder man ist der Team-Ersteller (für das erste Mitglied)
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
    OR 
    -- Oder man ist bereits Admin
    public.is_team_admin(team_id)
    OR
    -- Oder man tritt selbst bei (für Einladungslinks)
    auth.uid() = user_id
  );

CREATE POLICY "memberships_all_admin_policy" ON public.memberships 
  FOR ALL USING (public.is_team_admin(team_id));

-- 5. Policies für PENALTIES
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "penalties_select_policy" ON public.penalties 
  FOR SELECT USING (public.is_team_member(team_id));

CREATE POLICY "penalties_admin_policy" ON public.penalties 
  FOR ALL USING (public.is_team_admin(team_id));
