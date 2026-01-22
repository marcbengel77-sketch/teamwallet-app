
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';

/**
 * Registriert einen neuen Benutzer mit E-Mail und Passwort.
 * Das Profil wird automatisch über einen Datenbank-Trigger in Supabase erstellt.
 */
export async function signUpWithEmail(email: string, password: string, fullName: string): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) throw error;
  // Kein manueller Insert mehr nötig! Der Trigger 'on_auth_user_created' erledigt das.
}

/**
 * Meldet einen Benutzer mit E-Mail und Passwort an.
 */
export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
}

/**
 * Meldet einen Benutzer über Google OAuth an.
 */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) throw error;
}

/**
 * Meldet den aktuellen Benutzer ab.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Ruft das Profil des aktuellen Benutzers ab.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, email')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user profile:', error);
    throw error;
  }
  
  return data || null;
}

/**
 * Aktualisiert ein Profil oder erstellt es, falls der Trigger fehlgeschlagen sein sollte.
 */
export async function createOrUpdateUserProfile(userId: string, email: string, fullName?: string | null): Promise<UserProfile> {
  if (!supabase) throw new Error("Supabase nicht initialisiert");

  const { data, error } = await supabase
    .from('profiles')
    .upsert({ 
      id: userId, 
      full_name: fullName, 
      email: email 
    }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error creating/updating user profile:', error);
    throw error;
  }
  return data;
}
