
import { supabase } from '../supabaseClient';
import { Team, Membership, UserRole } from '../types';

/**
 * Erstellt ein neues Team und eine entsprechende Admin-Mitgliedschaft für den Ersteller.
 * @param teamName Der Name des neuen Teams.
 * @param userId Die UUID des Benutzers, der das Team erstellt.
 * @returns {Promise<Team>} Das neu erstellte Team.
 */
export async function createTeam(teamName: string, userId: string): Promise<Team> {
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
 * @param userId Die UUID des Benutzers.
 * @returns {Promise<Team[]>} Eine Liste der Teams.
 */
export async function getUserTeams(userId: string): Promise<Team[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select('team:teams(*)')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user teams:', error);
    throw error;
  }

  return data.map((item: { team: Team }) => item.team);
}

/**
 * Ruft die Mitgliedschaften eines Benutzers für ein bestimmtes Team ab, inklusive Benutzerprofilen.
 * @param teamId Die UUID des Teams.
 * @returns {Promise<Membership[]>} Eine Liste der Team-Mitgliedschaften.
 */
export async function getTeamMemberships(teamId: string): Promise<Membership[]> {
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
 * @param membershipId Die UUID der Mitgliedschaft.
 * @param newRole Die neue Rolle (admin, vice_admin, member).
 * @returns {Promise<void>}
 */
export async function updateMemberRole(membershipId: string, newRole: UserRole): Promise<void> {
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
 * @param userId Die UUID des Benutzers.
 * @param teamId Die UUID des Teams.
 * @returns {Promise<Membership | null>} Die Mitgliedschaft oder null, wenn nicht gefunden.
 */
export async function getUserMembershipForTeam(userId: string, teamId: string): Promise<Membership | null> {
  const { data, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 indicates no rows found
    console.error('Error fetching user membership for team:', error);
    throw error;
  }

  return data as Membership | null;
}

/**
 * Aktualisiert die Details eines Teams.
 * @param teamId Die UUID des Teams.
 * @param updates Die zu aktualisierenden Felder (z.B. name, is_premium).
 * @returns {Promise<void>}
 */
export async function updateTeam(teamId: string, updates: Partial<Team>): Promise<void> {
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
 * @param teamId Die UUID des Teams.
 * @returns {Promise<boolean>} True, wenn das Team Premium ist, sonst False.
 */
export async function checkPremium(teamId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('teams')
    .select('is_premium')
    .eq('id', teamId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking team premium status:', error);
    throw error;
  }

  return data?.is_premium || false;
}
