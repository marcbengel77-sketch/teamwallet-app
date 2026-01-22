
// Hilfsfunktion zum Abrufen von Umgebungsvariablen oder gespeicherten Werten
const getEnv = (name: string): string => {
  // 1. Suche in process.env (für Node/Sandbox Umgebungen)
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name] || '';
  }
  
  // 2. Suche in window (für globale Injektionen)
  if (typeof window !== 'undefined' && (window as any).env && (window as any).env[name]) {
    return (window as any).env[name] || '';
  }

  // 3. Suche im localStorage (für persistentes Setup im Browser)
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(`APP_${name}`) || '';
  }
  
  return '';
};

export const SUPABASE_URL = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL') || '';
export const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY') || '';

export const isSupabaseConfigured = SUPABASE_URL.trim().length > 0 && SUPABASE_ANON_KEY.trim().length > 0;

/**
 * Speichert die Konfiguration im LocalStorage, damit die App ohne Env-Variablen funktioniert.
 */
export const saveSupabaseConfig = (url: string, key: string) => {
  localStorage.setItem('APP_SUPABASE_URL', url.trim());
  localStorage.setItem('APP_SUPABASE_ANON_KEY', key.trim());
  window.location.reload();
};
