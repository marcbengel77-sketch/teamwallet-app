
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';

/**
 * Registriert einen neuen Benutzer mit E-Mail und Passwort und erstellt ein initiales Profil.
 * @param email Die E-Mail des Benutzers.
 * @param password Das Passwort des Benutzers.
 * @param fullName Der vollständige Name des Benutzers.
 * @returns {Promise<void>}
 */
export async function signUpWithEmail(email: string, password: string, fullName: string): Promise<void> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) throw error;

  if (data.user) {
    // Optional: Zusätzliches Profil in der 'profiles'-Tabelle erstellen
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: data.user.id, full_name: fullName, email: email });
    if (profileError) throw profileError;
  }
}

/**
 * Meldet einen Benutzer mit E-Mail und Passwort an.
 * @param email Die E-Mail des Benutzers.
 * @param password Das Passwort des Benutzers.
 * @returns {Promise<void>}
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
 * @returns {Promise<void>}
 */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin, // Leitet nach erfolgreicher Auth zurück zur App
    },
  });
  if (error) throw error;
}

/**
 * Meldet den aktuellen Benutzer ab.
 * @returns {Promise<void>}
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Ruft das Profil des aktuellen Benutzers ab.
 * @param userId Die UUID des Benutzers.
 * @returns {Promise<UserProfile | null>} Das Benutzerprofil oder null, wenn nicht gefunden.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 indicates no rows found
    console.error('Error fetching user profile:', error);
    throw error;
  }
  
  if (data) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error fetching auth user for email:', userError);
      throw userError;
    }
    return { ...data, email: userData.user?.email || null };
  }

  return null;
}

/**
 * Erstellt ein Profil für einen Benutzer, falls noch keines existiert (z.B. nach Google OAuth, wenn Profil nicht automatisch erstellt wurde).
 * @param userId Die UUID des Benutzers.
 * @param email Die E-Mail des Benutzers.
 * @param fullName Der vollständige Name des Benutzers.
 * @returns {Promise<UserProfile>} Das erstellte oder aktualisierte Benutzerprofil.
 */
export async function createOrUpdateUserProfile(userId: string, email: string, fullName?: string | null): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, full_name: fullName, email: email }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error creating/updating user profile:', error);
    throw error;
  }
  return { ...data, email: email };
}
