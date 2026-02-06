
-- ==========================================================
-- 1. BASIS-TABELLEN (Vollständigkeit prüfen)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    email TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    season TEXT DEFAULT '2025/26',
    created_by UUID REFERENCES auth.users(id),
    is_premium BOOLEAN DEFAULT FALSE,
    paypal_handle TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', 
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, team_id)
);

CREATE TABLE IF NOT EXISTS public.penalty_catalog (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.penalties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    penalty_catalog_id UUID REFERENCES public.penalty_catalog(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    date_assigned DATE DEFAULT CURRENT_DATE,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMP WITH TIME ZONE,
    transaction_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    payer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    type TEXT NOT NULL, 
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    category TEXT,
    date_expense DATE DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES auth.users(id),
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.team_invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================
-- 2. HILFSFUNKTIONEN (Security Definer umgeht RLS)
-- ==========================================================

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

-- ==========================================================
-- 3. RLS RICHTLINIEN (REPARATUR)
-- ==========================================================

ALTER TABLE public.penalty_catalog ENABLE ROW LEVEL SECURITY;

-- Jeder darf seinen eigenen Katalog sehen, wenn er Mitglied ist
DROP POLICY IF EXISTS "catalog_select" ON public.penalty_catalog;
CREATE POLICY "catalog_select" ON public.penalty_catalog FOR SELECT TO authenticated 
USING (public.is_team_member(team_id));

-- Admin darf verwalten
DROP POLICY IF EXISTS "catalog_admin" ON public.penalty_catalog;
CREATE POLICY "catalog_admin" ON public.penalty_catalog FOR ALL TO authenticated 
USING (public.is_team_admin(team_id));

-- Falls jemand Ersteller ist, aber (warum auch immer) nicht in memberships:
DROP POLICY IF EXISTS "catalog_owner" ON public.penalty_catalog;
CREATE POLICY "catalog_owner" ON public.penalty_catalog FOR ALL TO authenticated 
USING (team_id IN (SELECT id FROM public.teams WHERE created_by = auth.uid()));

-- Expenses RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "exp_all" ON public.expenses;
CREATE POLICY "exp_all" ON public.expenses FOR ALL TO authenticated 
USING (public.is_team_member(team_id));
