/*
  # TeamWallet - Datenbank-Schema Teil 1: Tabellen
  
  1. Neue Tabellen
    - profiles: Benutzerprofile
    - teams: Mannschaften
    - memberships: Team-Mitgliedschaften
    - penalty_catalog: Strafenkatalog
    - penalties: Zugewiesene Strafen
    - transactions: Transaktionen
    - expenses: Ausgaben
    - team_invites: Einladungen
    - notifications: Benachrichtigungen
    
  2. Hinweise
    - RLS wird aktiviert aber Policies kommen im nächsten Schritt
    - Alle Foreign Keys sind definiert
    - Indizes für Performance
*/

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== PROFILES ====================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  email text,
  created_at timestamptz DEFAULT now()
);

-- ==================== TEAMS ====================
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  season text DEFAULT '2025/26',
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_premium boolean DEFAULT false,
  paypal_handle text,
  created_at timestamptz DEFAULT now()
);

-- ==================== MEMBERSHIPS ====================
CREATE TABLE IF NOT EXISTS public.memberships (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'vice_admin', 'member')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, team_id)
);

-- ==================== PENALTY CATALOG ====================
CREATE TABLE IF NOT EXISTS public.penalty_catalog (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ==================== PENALTIES ====================
CREATE TABLE IF NOT EXISTS public.penalties (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  penalty_catalog_id uuid REFERENCES public.penalty_catalog(id) ON DELETE SET NULL,
  date_assigned date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  is_paid boolean DEFAULT false,
  paid_at timestamptz,
  transaction_id uuid,
  created_at timestamptz DEFAULT now()
);

-- ==================== TRANSACTIONS ====================
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  payer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  type text NOT NULL CHECK (type IN ('penalty_payment', 'deposit', 'withdrawal', 'expense')),
  description text,
  created_at timestamptz DEFAULT now()
);

-- ==================== EXPENSES ====================
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  description text,
  category text,
  date_expense date DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  receipt_url text,
  created_at timestamptz DEFAULT now()
);

-- ==================== TEAM INVITES ====================
CREATE TABLE IF NOT EXISTS public.team_invites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  email text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ==================== NOTIFICATIONS ====================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_team_id ON public.memberships(team_id);
CREATE INDEX IF NOT EXISTS idx_penalties_team_id ON public.penalties(team_id);
CREATE INDEX IF NOT EXISTS idx_penalties_user_id ON public.penalties(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_team_id ON public.transactions(team_id);
CREATE INDEX IF NOT EXISTS idx_expenses_team_id ON public.expenses(team_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_token ON public.team_invites(token);

-- ==================== ENABLE RLS (Policies kommen im nächsten Schritt) ====================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalty_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
