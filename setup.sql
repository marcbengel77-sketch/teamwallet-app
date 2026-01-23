
-- ==========================================
-- 1. BASIS-STRUKTUR (Falls noch nicht vorhanden)
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
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
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

-- ==========================================
-- 2. RELATIONSHIPS REPARIEREN (Der wichtigste Fix)
-- ==========================================

-- Wir löschen bestehende Constraints und setzen sie sauber neu, 
-- damit die API die Verbindung zwischen Strafen und Profilen erkennt.
ALTER TABLE IF EXISTS public.penalties DROP CONSTRAINT IF EXISTS penalties_user_id_fkey;
ALTER TABLE public.penalties 
ADD CONSTRAINT penalties_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.penalties DROP CONSTRAINT IF EXISTS penalties_penalty_catalog_id_fkey;
ALTER TABLE public.penalties 
ADD CONSTRAINT penalties_penalty_catalog_id_fkey 
FOREIGN KEY (penalty_catalog_id) 
REFERENCES public.penalty_catalog(id) 
ON DELETE SET NULL;

-- Indexe für bessere Performance
CREATE INDEX IF NOT EXISTS idx_penalties_user_id ON public.penalties(user_id);
CREATE INDEX IF NOT EXISTS idx_penalties_team_id ON public.penalties(team_id);

-- ==========================================
-- 3. SICHERHEIT (RLS)
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;

-- Profile müssen lesbar sein für Joins
DROP POLICY IF EXISTS "Public Profiles" ON public.profiles;
CREATE POLICY "Public Profiles" ON public.profiles FOR SELECT USING (true);

-- ==========================================
-- 4. API CACHE REFRESH (Workaround)
-- ==========================================
-- Da PostgREST Config oft schwer zu finden ist: 
-- Das Erstellen und Löschen einer View zwingt die API oft zum Neuladen des Schemas.
CREATE OR REPLACE VIEW public.api_refresh AS SELECT 1;
DROP VIEW public.api_refresh;

-- Optional: Falls Fehler auftreten, führe dies separat aus:
-- NOTIFY pgrst, 'reload schema';
