
-- ==========================================
-- 1. BASIS-STRUKTUR (Bleibt bestehen)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  season TEXT DEFAULT '2025/26',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_premium BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.penalty_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. HILFSFUNKTIONEN FÜR RLS
-- ==========================================

-- Prüft allgemeine Mitgliedschaft
CREATE OR REPLACE FUNCTION public.is_member_of(t_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE team_id = t_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Prüft Admin-Rechte (Admin oder Vizeadmin)
CREATE OR REPLACE FUNCTION public.is_admin_of(t_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE team_id = t_id 
    AND user_id = auth.uid() 
    AND role IN ('admin', 'vice_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ==========================================
-- 3. RLS POLICIES (VERFEINERT)
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalty_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 3a. Profile
DROP POLICY IF EXISTS "Enable select for all" ON public.profiles;
CREATE POLICY "Enable select for all" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable update for owners" ON public.profiles;
CREATE POLICY "Enable update for owners" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 3b. Teams
DROP POLICY IF EXISTS "Team select" ON public.teams;
CREATE POLICY "Team select" ON public.teams FOR SELECT USING (public.is_member_of(id));
DROP POLICY IF EXISTS "Team insert" ON public.teams;
CREATE POLICY "Team insert" ON public.teams FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Team update" ON public.teams;
CREATE POLICY "Team update" ON public.teams FOR UPDATE USING (public.is_admin_of(id));

-- 3c. Mitgliedschaften
DROP POLICY IF EXISTS "Membership select" ON public.memberships;
CREATE POLICY "Membership select" ON public.memberships FOR SELECT 
USING (user_id = auth.uid() OR public.is_member_of(team_id));

DROP POLICY IF EXISTS "Membership insert" ON public.memberships;
CREATE POLICY "Membership insert" ON public.memberships FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Membership manage" ON public.memberships;
CREATE POLICY "Membership manage" ON public.memberships FOR UPDATE
USING (public.is_admin_of(team_id));

-- 3d. Strafen (Penalties)
DROP POLICY IF EXISTS "Penalty select" ON public.penalties;
CREATE POLICY "Penalty select" ON public.penalties FOR SELECT USING (public.is_member_of(team_id));

DROP POLICY IF EXISTS "Penalty manage" ON public.penalties;
CREATE POLICY "Penalty manage" ON public.penalties FOR ALL 
USING (public.is_admin_of(team_id));

-- 3e. Strafenkatalog
DROP POLICY IF EXISTS "Catalog select" ON public.penalty_catalog;
CREATE POLICY "Catalog select" ON public.penalty_catalog FOR SELECT USING (public.is_member_of(team_id));

DROP POLICY IF EXISTS "Catalog manage" ON public.penalty_catalog;
CREATE POLICY "Catalog manage" ON public.penalty_catalog FOR ALL 
USING (public.is_admin_of(team_id));

-- 3f. Transaktionen
DROP POLICY IF EXISTS "Transaction select" ON public.transactions;
CREATE POLICY "Transaction select" ON public.transactions FOR SELECT USING (public.is_member_of(team_id));

DROP POLICY IF EXISTS "Transaction insert" ON public.transactions;
CREATE POLICY "Transaction insert" ON public.transactions FOR INSERT 
WITH CHECK (public.is_admin_of(team_id));
