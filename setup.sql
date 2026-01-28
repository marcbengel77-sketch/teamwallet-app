
-- ==========================================
-- 1. BASIS-STRUKTUR
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
  is_premium BOOLEAN DEFAULT FALSE,
  paypal_handle TEXT -- Neu: PayPal E-Mail oder Handle
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

-- Falls die Spalte noch nicht existiert (Migration)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='paypal_handle') THEN
    ALTER TABLE public.teams ADD COLUMN paypal_handle TEXT;
  END IF;
END $$;

-- ==========================================
-- 2. SICHERHEITS-FUNKTIONEN (SECURITY DEFINER)
-- ==========================================

CREATE OR REPLACE FUNCTION public.check_is_member(t_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE team_id = t_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_is_admin(t_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE team_id = t_id 
    AND user_id = auth.uid() 
    AND role IN ('admin', 'vice_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 3. RLS POLICIES
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalty_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 3a. Profile
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 3b. Teams
DROP POLICY IF EXISTS "teams_select" ON public.teams;
CREATE POLICY "teams_select" ON public.teams FOR SELECT USING (public.check_is_member(id));
DROP POLICY IF EXISTS "teams_insert" ON public.teams;
CREATE POLICY "teams_insert" ON public.teams FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "teams_update" ON public.teams;
CREATE POLICY "teams_update" ON public.teams FOR UPDATE USING (public.check_is_admin(id));

-- 3c. Mitgliedschaften
DROP POLICY IF EXISTS "memberships_select" ON public.memberships;
CREATE POLICY "memberships_select" ON public.memberships FOR SELECT 
USING (user_id = auth.uid() OR public.check_is_member(team_id));

DROP POLICY IF EXISTS "memberships_insert" ON public.memberships;
CREATE POLICY "memberships_insert" ON public.memberships FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "memberships_update" ON public.memberships;
CREATE POLICY "memberships_update" ON public.memberships FOR UPDATE
USING (public.check_is_admin(team_id));

-- 3d. Strafen & Katalog
DROP POLICY IF EXISTS "penalties_select" ON public.penalties;
CREATE POLICY "penalties_select" ON public.penalties FOR SELECT USING (public.check_is_member(team_id));
DROP POLICY IF EXISTS "penalties_all" ON public.penalties;
CREATE POLICY "penalties_all" ON public.penalties FOR ALL USING (public.check_is_admin(team_id));

DROP POLICY IF EXISTS "catalog_select" ON public.penalty_catalog;
CREATE POLICY "catalog_select" ON public.penalty_catalog FOR SELECT USING (public.check_is_member(team_id));
DROP POLICY IF EXISTS "catalog_all" ON public.penalty_catalog;
CREATE POLICY "catalog_all" ON public.penalty_catalog FOR ALL USING (public.check_is_admin(team_id));

-- 3e. Transaktionen
DROP POLICY IF EXISTS "transactions_select" ON public.transactions;
CREATE POLICY "transactions_select" ON public.transactions FOR SELECT USING (public.check_is_member(team_id));
DROP POLICY IF EXISTS "transactions_insert" ON public.transactions;
CREATE POLICY "transactions_insert" ON public.transactions FOR INSERT WITH CHECK (public.check_is_admin(team_id));
