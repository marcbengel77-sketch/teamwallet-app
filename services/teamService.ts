
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
    console.warn('Admin membership entry could not be created, might already exist.');
  }

  return teamData;
}

/**
 * Löscht ein Team vollständig.
 */
export async function deleteTeam(teamId: string): Promise<void> {
  if (!supabase) throw new Error("Datenbankverbindung nicht konfiguriert.");
  
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId);

  if (error) {
    console.error('Error deleting team:', error);
    throw error;
  }
}

/**
 * Ruft alle Teams ab. Dank RLS liefert die Datenbank nur die Teams zurück, 
 * in denen der User Mitglied ist oder die er erstellt hat.
 */
export async function getUserTeams(userId: string): Promise<Team[]> {
  if (!supabase) return [];
  
  // Da RLS auf der Tabelle 'teams' aktiv ist, können wir direkt abfragen.
  // Das ist viel stabiler als komplexe Joins.
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user teams:', error);
    throw error;
  }

  return data || [];
}

/**
 * Ruft die Mitgliedschaften eines Teams ab.
 */
export async function getTeamMemberships(teamId: string): Promise<Membership[]> {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('memberships')
    .select('*, user_profile:profiles(id, full_name, avatar_url, email)')
    .eq('team_id', teamId);

  if (error) {
    console.error('Error fetching team memberships:', error);
    throw error;
  }

  return data as Membership[];
}

/**
 * Aktualisiert die Rolle eines Mitglieds.
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
 * Ruft die spezifische Rolle des Users im Team ab.
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
 * Team-Update.
 */
export async function updateTeam(teamId: string, updates: Partial<Team>): Promise<void> {
  if (!supabase) throw new Error("Datenbankverbindung nicht konfiguriert.");
  
  const { error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', teamId);

  if (error) throw error;
}
