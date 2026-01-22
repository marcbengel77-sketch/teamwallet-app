-- 1. AUFRÄUMEN (Optional, falls Typen schon existieren)
-- Wir löschen die Policies zuerst, um Konflikte zu vermeiden
DROP POLICY IF EXISTS "Teams_Select" ON public.teams;
DROP POLICY IF EXISTS "Memberships_Select" ON public.memberships;

-- 2. TABELLEN ERSTELLEN
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  season TEXT DEFAULT '2025/26',
  created_by UUID REFERENCES auth.users NOT NULL,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'vice_admin', 'member');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE membership_status AS ENUM ('active', 'inactive', 'pending');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  team_id UUID REFERENCES public.teams ON DELETE CASCADE NOT NULL,
  role user_role DEFAULT 'member' NOT NULL,
  status membership_status DEFAULT 'active' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, team_id)
);

CREATE TABLE IF NOT EXISTS public.penalty_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('penalty_payment', 'deposit', 'withdrawal');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams ON DELETE CASCADE NOT NULL,
  payer_id UUID REFERENCES auth.users NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type transaction_type NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.penalties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  penalty_catalog_id UUID REFERENCES public.penalty_catalog ON DELETE SET NULL,
  date_assigned DATE DEFAULT CURRENT_DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMP WITH TIME ZONE,
  transaction_id UUID REFERENCES public.transactions ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. HILFSFUNKTIONEN (GEGEN REKURSION)
-- Diese Funktion prüft die Mitgliedschaft, OHNE RLS zu triggern

CREATE OR REPLACE FUNCTION public.check_is_team_member(t_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships
    WHERE team_id = t_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_is_team_admin(t_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships
    WHERE team_id = t_id AND user_id = auth.uid() AND role IN ('admin', 'vice_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profil-Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. RLS AKTIVIEREN
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalty_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 5. POLICIES (KORRIGIERT)

-- Profiles
DROP POLICY IF EXISTS "Profile_Select" ON public.profiles;
CREATE POLICY "Profile_Select" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Profile_Update" ON public.profiles;
CREATE POLICY "Profile_Update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Teams
DROP POLICY IF EXISTS "Teams_Select" ON public.teams;
CREATE POLICY "Teams_Select" ON public.teams FOR SELECT USING (
  auth.uid() = created_by OR public.check_is_team_member(id)
);
DROP POLICY IF EXISTS "Teams_Insert" ON public.teams;
CREATE POLICY "Teams_Insert" ON public.teams FOR INSERT WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Teams_Update" ON public.teams;
CREATE POLICY "Teams_Update" ON public.teams FOR UPDATE USING (
  auth.uid() = created_by OR public.check_is_team_admin(id)
);

-- Memberships (Hier lag der Fehler)
DROP POLICY IF EXISTS "Memberships_Select" ON public.memberships;
CREATE POLICY "Memberships_Select" ON public.memberships FOR SELECT USING (
  auth.uid() = user_id OR -- Eigene Mitgliedschaft immer sichtbar
  public.check_is_team_member(team_id) OR -- Teamkollegen sehen sich
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid()) -- Team-Besitzer sieht alle
);

DROP POLICY IF EXISTS "Memberships_Insert" ON public.memberships;
CREATE POLICY "Memberships_Insert" ON public.memberships FOR INSERT WITH CHECK (
  auth.uid() = user_id OR public.check_is_team_admin(team_id)
);

DROP POLICY IF EXISTS "Memberships_Update" ON public.memberships;
CREATE POLICY "Memberships_Update" ON public.memberships FOR UPDATE USING (
  public.check_is_team_admin(team_id)
);

-- Strafen & Transaktionen (nutzen die neue Funktion)
DROP POLICY IF EXISTS "Catalog_Policy" ON public.penalty_catalog;
CREATE POLICY "Catalog_Policy" ON public.penalty_catalog FOR ALL USING (public.check_is_team_member(team_id));

DROP POLICY IF EXISTS "Penalties_Policy" ON public.penalties;
CREATE POLICY "Penalties_Policy" ON public.penalties FOR ALL USING (public.check_is_team_member(team_id));

DROP POLICY IF EXISTS "Transactions_Policy" ON public.transactions;
CREATE POLICY "Transactions_Policy" ON public.transactions FOR ALL USING (public.check_is_team_member(team_id));
