
-- ==========================================
-- 1. BASIS-STRUKTUR & UPDATES
-- ==========================================

-- Profile
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  season TEXT DEFAULT '2025/26',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FIX: Spalte is_premium hinzufügen, falls sie fehlt
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='is_premium') THEN
    ALTER TABLE public.teams ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Mitgliedschaften
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Strafenkatalog
CREATE TABLE IF NOT EXISTS public.penalty_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Strafen (Zuweisungen)
CREATE TABLE IF NOT EXISTS public.penalties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  penalty_catalog_id UUID REFERENCES public.penalty_catalog(id) ON DELETE SET NULL,
  date_assigned DATE DEFAULT CURRENT_DATE,
  amount DECIMAL(10,2) NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  transaction_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaktionen
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL, -- 'penalty_payment', 'deposit', 'withdrawal'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. SICHERHEIT (RLS) - POLICIES
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalty_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 2a. Profile
DROP POLICY IF EXISTS "Public Profiles" ON public.profiles;
CREATE POLICY "Public Profiles" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2b. Teams
DROP POLICY IF EXISTS "Members can view their teams" ON public.teams;
CREATE POLICY "Members can view their teams" ON public.teams 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.memberships WHERE team_id = teams.id AND user_id = auth.uid())
  );
-- NEU: Erlaubt Nutzern, Teams zu erstellen
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
CREATE POLICY "Users can create teams" ON public.teams FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 2c. Mitgliedschaften
-- ESSENZIELL: Nutzer muss seine eigenen Mitgliedschaften sehen können, um das Team zu finden!
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.memberships;
CREATE POLICY "Users can view their own memberships" ON public.memberships 
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Members can view team memberships" ON public.memberships;
CREATE POLICY "Members can view team memberships" ON public.memberships 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.memberships m2 WHERE m2.team_id = memberships.team_id AND m2.user_id = auth.uid())
  );
-- NEU: Erlaubt das Erstellen von Mitgliedschaften (wichtig beim Team-Setup)
DROP POLICY IF EXISTS "Users can create memberships" ON public.memberships;
CREATE POLICY "Users can create memberships" ON public.memberships FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 2d. Strafenkatalog
DROP POLICY IF EXISTS "Members can view penalty catalog" ON public.penalty_catalog;
CREATE POLICY "Members can view penalty catalog" ON public.penalty_catalog 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.memberships WHERE team_id = penalty_catalog.team_id AND user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Admins can manage penalty catalog" ON public.penalty_catalog;
CREATE POLICY "Admins can manage penalty catalog" ON public.penalty_catalog 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.memberships WHERE team_id = penalty_catalog.team_id AND user_id = auth.uid() AND role IN ('admin', 'vice_admin'))
  );

-- 2e. Strafen
DROP POLICY IF EXISTS "Members can view penalties" ON public.penalties;
CREATE POLICY "Members can view penalties" ON public.penalties 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.memberships WHERE team_id = penalties.team_id AND user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Admins can manage penalties" ON public.penalties;
CREATE POLICY "Admins can manage penalties" ON public.penalties 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.memberships WHERE team_id = penalties.team_id AND user_id = auth.uid() AND role IN ('admin', 'vice_admin'))
  );

-- 2f. Transaktionen
DROP POLICY IF EXISTS "Team members can view transactions" ON public.transactions;
CREATE POLICY "Team members can view transactions" ON public.transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.memberships WHERE memberships.team_id = transactions.team_id AND memberships.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Admins can insert transactions" ON public.transactions;
CREATE POLICY "Admins can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (true);

-- API Refresh
CREATE OR REPLACE VIEW public.api_refresh AS SELECT 1;
DROP VIEW public.api_refresh;
