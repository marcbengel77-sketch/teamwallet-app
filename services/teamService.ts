
import { supabase } from '../supabaseClient';
import { Team, Membership, UserRole } from '../types';

/**
 * Erstellt ein neues Team und eine entsprechende Admin-Mitgliedschaft für den Ersteller.
 */
export async function createTeam(teamName: string, userId: string): Promise<Team> {
  if (!supabase) throw new Error("Datenbankverbindung nicht konfiguriert.");
  
  const { data: teamData, error: teamError } = await supabase
    .from('teams')
    .insert({ name: teamName, created_by: userId })
    .select()
    .single();

  if (teamError) {
    console.error('Error creating team:', teamError);
    throw teamError;
  }

  // Erstelle eine Mitgliedschaft für den Ersteller als Admin
  const { error: membershipError } = await supabase
    .from('memberships')
    .insert({ user_id: userId, team_id: teamData.id, role: UserRole.Admin });

  if (membershipError) {
    console.error('Error creating admin membership:', membershipError);
    // Rollback team creation if membership fails
    await supabase.from('teams').delete().eq('id', teamData.id);
    throw membershipError;
  }

  return teamData;
}

/**
 * Ruft alle Teams ab, in denen der Benutzer Mitglied ist.
 */
export async function getUserTeams(userId: string): Promise<Team[]> {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('memberships')
    .select('team:teams(*)')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user teams:', error);
    throw error;
  }

  if (!data) return [];

  return (data as any[]).map((item: any) => {
    const teamData = item.team;
    return (Array.isArray(teamData) ? teamData[0] : teamData) as Team;
  }).filter((team): team is Team => !!team);
}

/**
 * Ruft die Mitgliedschaften eines Benutzers für ein bestimmtes Team ab.
 */
export async function getTeamMemberships(teamId: string): Promise<Membership[]> {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('memberships')
    .select('*, user_profile:profiles(full_name, avatar_url, email)')
    .eq('team_id', teamId);

  if (error) {
    console.error('Error fetching team memberships:', error);
    throw error;
  }

  return data as Membership[];
}

/**
 * Aktualisiert die Rolle eines Mitglieds in einem Team.
 */
export async function updateMemberRole(membershipId: string, newRole: UserRole): Promise<void> {
  if (!supabase) throw new Error("Datenbankverbindung nicht konfiguriert.");
  
  const { error } = await supabase
    .from('memberships')
    .update({ role: newRole })
    .eq('id', membershipId);

  if (error) {
    console.error('Error updating member role:', error);
    throw error;
  }
}

/**
 * Ruft die Mitgliedschaft eines bestimmten Benutzers für ein bestimmtes Team ab.
 */
export async function getUserMembershipForTeam(userId: string, teamId: string): Promise<Membership | null> {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user membership for team:', error);
    throw error;
  }

  return data as Membership | null;
}

/**
 * Aktualisiert die Details eines Teams.
 */
export async function updateTeam(teamId: string, updates: Partial<Team>): Promise<void> {
  if (!supabase) throw new Error("Datenbankverbindung nicht konfiguriert.");
  
  const { error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', teamId);

  if (error) {
    console.error('Error updating team:', error);
    throw error;
  }
}

/**
 * Prüft, ob ein Team Premium-Zugang hat.
 */
export async function checkPremium(teamId: string): Promise<boolean> {
  if (!supabase) return false;
  
  const { data, error } = await supabase
    .from('teams')
    .select('is_premium')
    .eq('id', teamId)
    .maybeSingle();

  if (error) {
    console.error('Error checking team premium status:', error);
    throw error;
  }

  return data?.is_premium || false;
}
