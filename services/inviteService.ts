
import { supabase } from '../supabaseClient';

export async function createInviteToken(teamId: string, email?: string) {
  if (!supabase) throw new Error("Datenbank nicht konfiguriert");
  
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  const { data, error } = await supabase
    .from('team_invites')
    .insert({
      team_id: teamId,
      token: token,
      email: email?.toLowerCase().trim(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 Tage
    })
    .select()
    .single();

  if (error) throw error;
  return data.token;
}

export async function getPendingInvites(teamId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('team_invites')
    .select('*')
    .eq('team_id', teamId)
    .gt('expires_at', new Date().toISOString());
    
  if (error) {
    console.error("Fehler beim Laden der Einladungen:", error);
    return [];
  }
  return data || [];
}

export async function getInviteDetails(token: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('team_invites')
    .select('*, team:teams(name)')
    .eq('token', token)
    .single();
    
  if (error) return null;
  return data;
}

export async function joinWithToken(token: string) {
  if (!supabase) throw new Error("Datenbank nicht konfiguriert");
  
  const { data, error } = await supabase.rpc('join_team_via_token', { _token: token });
  
  if (error) throw error;
  return data;
}

export async function syncInvites() {
  if (!supabase) return;
  await supabase.rpc('sync_user_invites');
}
