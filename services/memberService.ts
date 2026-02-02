
import { supabase } from '../supabaseClient';
import { UserRole, Membership } from '../types';

/**
 * Fügt einen neuen Benutzer zu einem Team hinzu oder verknüpft einen bestehenden Benutzer.
 */
export async function addMemberToTeam(teamId: string, email: string, fullName: string, role: UserRole = UserRole.Member): Promise<Membership> {
  if (!supabase) throw new Error("Datenbankverbindung nicht konfiguriert.");

  // 1. Suche in der 'profiles' Tabelle nach der E-Mail
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (profileError) {
    console.error('Error fetching profile by email:', profileError);
    throw new Error('Fehler bei der Suche nach dem Benutzerprofil.');
  }

  if (!profileData) {
    throw new Error('Benutzer mit dieser E-Mail ist noch nicht in der App registriert. Bitte bitten Sie das Mitglied, sich zuerst einmal anzumelden.');
  }

  const userId = profileData.id;

  // 2. Prüfen, ob die Mitgliedschaft bereits existiert
  const { data: existingMembership, error: existingMembershipError } = await supabase
    .from('memberships')
    .select('*')
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (existingMembershipError) {
    console.error('Error checking existing membership:', existingMembershipError);
    throw new Error('Fehler beim Prüfen bestehender Mitgliedschaften.');
  }

  if (existingMembership) {
    throw new Error('Dieser Benutzer ist bereits Mitglied dieses Teams.');
  }

  // 3. Mitgliedschaft erstellen
  const { data: membershipData, error: membershipError } = await supabase
    .from('memberships')
    .insert({ 
      user_id: userId, 
      team_id: teamId, 
      role: role 
    })
    .select('*, user_profile:profiles(full_name, avatar_url, email)')
    .single();

  if (membershipError) {
    console.error('Error creating membership:', membershipError);
    if (membershipError.code === '42501') {
      throw new Error('Berechtigung verweigert. Nur Admins können Mitglieder hinzufügen.');
    }
    throw new Error(`Konnte Mitgliedschaft nicht erstellen: ${membershipError.message}`);
  }

  return membershipData as Membership;
}

/**
 * Entfernt ein Mitglied aus dem Team (löscht die Mitgliedschaft).
 */
export async function removeMemberFromTeam(membershipId: string): Promise<void> {
  if (!supabase) throw new Error("Datenbankverbindung nicht konfiguriert.");
  
  const { error } = await supabase
    .from('memberships')
    .delete()
    .eq('id', membershipId);

  if (error) {
    console.error('Error removing member:', error);
    throw new Error(`Fehler beim Entfernen des Mitglieds: ${error.message}`);
  }
}
