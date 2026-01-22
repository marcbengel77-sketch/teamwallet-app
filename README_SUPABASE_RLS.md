
# Supabase Setup Guide: Tabellen & RLS Policies

Dieses Dokument enthält alle SQL-Befehle, die Sie im **SQL Editor** Ihrer Supabase-Konsole ausführen müssen, um die Datenbankstruktur und die Sicherheitsregeln (RLS) für die Teamkasse-App zu erstellen.

---

## 1. Tabellen erstellen (Schema)

Führen Sie diesen Block zuerst aus, um alle notwendigen Tabellen anzulegen:

```sql
-- 1. Profiles (Erweiterung der Auth-Daten)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Teams
CREATE TABLE public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  season TEXT DEFAULT '2025/26',
  created_by UUID REFERENCES auth.users NOT NULL,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Memberships (Rollenverteilung)
CREATE TYPE user_role AS ENUM ('admin', 'vice_admin', 'member');
CREATE TYPE membership_status AS ENUM ('active', 'inactive', 'pending');

CREATE TABLE public.memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  team_id UUID REFERENCES public.teams ON DELETE CASCADE NOT NULL,
  role user_role DEFAULT 'member' NOT NULL,
  status membership_status DEFAULT 'active' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, team_id)
);

-- 4. Penalty Catalog (Strafenkatalog)
CREATE TABLE public.penalty_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Transactions (Zahlungsverkehr)
CREATE TYPE transaction_type AS ENUM ('penalty_payment', 'deposit', 'withdrawal');

CREATE TABLE public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams ON DELETE CASCADE NOT NULL,
  payer_id UUID REFERENCES auth.users NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type transaction_type NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Penalties (Vergebene Strafen)
CREATE TABLE public.penalties (
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

-- RLS für alle Tabellen aktivieren
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalty_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
```

---

## 2. RLS Policies anwenden

Diese Regeln stellen sicher, dass Benutzer nur Daten ihrer eigenen Teams sehen können.

### profiles
```sql
CREATE POLICY "Profile sichtbar für Besitzer" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profile aktualisierbar durch Besitzer" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Profile erstellbar durch Auth" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
```

### teams
```sql
CREATE POLICY "Teams sichtbar für Mitglieder" ON public.teams FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.memberships WHERE team_id = teams.id AND user_id = auth.uid())
);
CREATE POLICY "Teams erstellbar durch Auth" ON public.teams FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Teams bearbeitbar durch Admins" ON public.teams FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.memberships WHERE team_id = teams.id AND user_id = auth.uid() AND role IN ('admin', 'vice_admin'))
);
```

### memberships
```sql
CREATE POLICY "Mitgliedschaften sichtbar für Teammitglieder" ON public.memberships FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.memberships AS m WHERE m.team_id = memberships.team_id AND m.user_id = auth.uid())
);
-- Erster Admin (Self-Insert bei Team-Erstellung)
CREATE POLICY "Self-admin bei Teamerstellung" ON public.memberships FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND created_by = auth.uid())
);
-- Admin fügt andere hinzu
CREATE POLICY "Admins fügen Mitglieder hinzu" ON public.memberships FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.memberships WHERE team_id = memberships.team_id AND user_id = auth.uid() AND role IN ('admin', 'vice_admin'))
);
```

### penalty_catalog, penalties, transactions
```sql
-- Beispiel für penalty_catalog (analog für penalties und transactions)
CREATE POLICY "Katalog sichtbar für Teammitglieder" ON public.penalty_catalog FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.memberships WHERE team_id = penalty_catalog.team_id AND user_id = auth.uid())
);
CREATE POLICY "Katalog Verwaltung durch Admins" ON public.penalty_catalog FOR ALL USING (
  EXISTS (SELECT 1 FROM public.memberships WHERE team_id = penalty_catalog.team_id AND user_id = auth.uid() AND role IN ('admin', 'vice_admin'))
);
-- Wenden Sie dieses Muster auch auf 'penalties' und 'transactions' an.
```
