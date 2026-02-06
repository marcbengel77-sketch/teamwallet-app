
import { supabase } from '../supabaseClient';
import { UserRole, Membership } from '../types';
import { createInviteToken } from './inviteService';

export interface AddMemberResponse {
  status: 'added' | 'invited';
  membership?: Membership;
  token?: string;
  email: string;
}

/**
 * Fügt einen Benutzer direkt hinzu (wenn registriert) oder generiert einen Einladungs-Token.
 */
export async function addMemberToTeam(teamId: string, email: string, fullName: string, role: UserRole = UserRole.Member): Promise<AddMemberResponse> {
  if (!supabase) throw new Error("Datenbankverbindung nicht konfiguriert.");

  const cleanEmail = email.trim().toLowerCase();

  // 1. Suche via RPC (Security Definer), um RLS-Probleme zu umgehen
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_user_id_by_email', { search_email: cleanEmail });

  if (rpcError) {
    console.error('RPC Error searching user:', rpcError);
    throw new Error('Fehler bei der technischen Benutzersuche: ' + rpcError.message);
  }

  // FALL A: Benutzer existiert bereits im System
  // rpcData gibt ein Array zurück, wir prüfen das erste Element
  if (rpcData && rpcData.length > 0) {
    const userId = rpcData[0].id;

    // Prüfen auf bestehende Mitgliedschaft
    const { data: existing } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .maybeSingle();

    if (existing) throw new Error('Dieser Benutzer ist bereits Mitglied in diesem Team.');

    const { data: membershipData, error: membershipError } = await supabase
      .from('memberships')
      .insert({ user_id: userId, team_id: teamId, role })
      .select('*, user_profile:profiles(full_name, avatar_url, email)')
      .single();

    if (membershipError) throw membershipError;

    return { status: 'added', membership: membershipData as Membership, email: cleanEmail };
  } 
  
  // FALL B: Benutzer existiert NICHT -> Einladungs-Token generieren
  // Dies wird nun auch erreicht, wenn der RPC keine Ergebnisse liefert
  const token = await createInviteToken(teamId);
  return { status: 'invited', token, email: cleanEmail };
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

  if (error) throw error;
}
