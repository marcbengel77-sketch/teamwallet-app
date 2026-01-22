
import { supabase } from '../supabaseClient';
import { UserRole, Membership } from '../types';
import { createOrUpdateUserProfile } from './authService';

/**
 * Fügt einen neuen Benutzer zu einem Team hinzu oder verknüpft einen bestehenden Benutzer.
 * @param teamId Die UUID des Teams.
 * @param email Die E-Mail des hinzuzufügenden Mitglieds.
 * @param fullName Der vollständige Name des hinzuzufügenden Mitglieds.
 * @param role Die Rolle des Mitglieds (standardmäßig 'member').
 * @returns {Promise<Membership>} Die neu erstellte oder verknüpfte Mitgliedschaft.
 */
export async function addMemberToTeam(teamId: string, email: string, fullName: string, role: UserRole = UserRole.Member): Promise<Membership> {
  // Suche in der 'profiles' Tabelle nach der E-Mail (muss dort vorhanden sein)
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (profileError) {
    console.error('Error fetching profile by email:', profileError);
    throw profileError;
  }

  let userId: string;
  if (profileData) {
    userId = profileData.id;
    // Profil aktualisieren, falls nötig
    await createOrUpdateUserProfile(userId, email, fullName);
  } else {
    // Da wir keinen Zugriff auf auth.users haben, muss der Benutzer bereits in profiles existieren
    // (was er tut, sobald er sich einmal in der App angemeldet hat).
    throw new Error('Benutzer mit dieser E-Mail ist noch nicht in der App registriert. Bitte bitten Sie das Mitglied, sich zuerst einmal anzumelden.');
  }

  // Prüfen, ob die Mitgliedschaft bereits existiert
  const { data: existingMembership, error: existingMembershipError } = await supabase
    .from('memberships')
    .select('*')
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (existingMembershipError) {
    console.error('Error checking existing membership:', existingMembershipError);
    throw existingMembershipError;
  }

  if (existingMembership) {
    throw new Error('Dieser Benutzer ist bereits Mitglied dieses Teams.');
  }

  // Mitgliedschaft erstellen
  const { data: membershipData, error: membershipError } = await supabase
    .from('memberships')
    .insert({ user_id: userId, team_id: teamId, role: role })
    .select('*, user_profile:profiles(full_name, avatar_url, email)')
    .single();

  if (membershipError) {
    console.error('Error creating membership:', membershipError);
    throw membershipError;
  }

  return membershipData as Membership;
}
