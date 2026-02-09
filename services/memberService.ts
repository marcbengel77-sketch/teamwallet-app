
import { supabase } from '../supabaseClient';
import { UserRole, Membership } from '../types';
import { createInviteToken } from './inviteService';

export interface AddMemberResponse {
  status: 'invited';
  isRegistered: boolean;
  token: string;
  email: string;
}

/**
 * Erstellt eine Einladung für eine E-Mail-Adresse. 
 * Der Benutzer muss diese aktiv über die App (Glocke) annehmen.
 */
export async function addMemberToTeam(teamId: string, email: string, fullName: string, role: UserRole = UserRole.Member): Promise<AddMemberResponse> {
  if (!supabase) throw new Error("Datenbankverbindung nicht konfiguriert.");

  const cleanEmail = email.trim().toLowerCase();

  // 1. Prüfen, ob der Benutzer bereits existiert (nur für UI-Feedback)
  const { data: rpcData } = await supabase.rpc('get_user_id_by_email', { search_email: cleanEmail });
  const userExists = rpcData && rpcData.length > 0;

  if (userExists) {
    const userId = rpcData[0].id;
    // Prüfen, ob bereits eine aktive Mitgliedschaft besteht
    const { data: existing } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .maybeSingle();

    if (existing) throw new Error('Dieser Benutzer ist bereits Mitglied in diesem Team.');
  } 

  // 2. IMMER einen Einladungs-Token generieren
  // Dies triggert (via syncInvites beim nächsten Login des Nutzers) die Benachrichtigung
  const token = await createInviteToken(teamId, cleanEmail);
  
  return { 
    status: 'invited', 
    isRegistered: userExists, 
    token, 
    email: cleanEmail 
  };
}

/**
 * Entfernt ein Mitglied aus dem Team.
 */
export async function removeMemberFromTeam(membershipId: string): Promise<void> {
  if (!supabase) throw new Error("Datenbankverbindung nicht konfiguriert.");
  const { error } = await supabase.from('memberships').delete().eq('id', membershipId);
  if (error) throw error;
}
