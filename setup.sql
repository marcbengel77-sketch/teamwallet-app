
-- 1. Profile: Nutzer müssen ihr eigenes Profil erstellen und bearbeiten können
-- Zudem müssen sie andere Profile im Team sehen können
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);


-- 2. Memberships: Jedes Teammitglied muss alle anderen Mitglieder sehen
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members can see all memberships of their teams" ON public.memberships;

-- Diese Policy nutzt eine Unterabfrage auf 'teams', um Rekursion zu vermeiden
CREATE POLICY "Team members can see all memberships of their teams" ON public.memberships
FOR SELECT TO authenticated
USING (
  team_id IN (
    SELECT id FROM public.teams -- Das ist sicher, da teams eigene RLS hat
  )
);


-- 3. Teams: Sichtbarkeit regeln
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see teams they are members of" ON public.teams;

CREATE POLICY "Users can see teams they are members of" ON public.teams
FOR SELECT TO authenticated
USING (
  created_by = auth.uid() OR 
  id IN (
    -- Wir greifen direkt auf die Tabelle zu ohne JOIN um Rekursion zu verhindern
    SELECT team_id FROM public.memberships WHERE user_id = auth.uid()
  )
);


-- 4. Einladungen (team_invites)
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_members_see_invites" ON public.team_invites;

CREATE POLICY "team_members_see_invites" ON public.team_invites 
FOR SELECT TO authenticated
USING (
  team_id IN (SELECT id FROM public.teams) OR 
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);
