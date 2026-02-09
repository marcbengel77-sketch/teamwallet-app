
/**
 * SUPABASE KONFIGURATION
 * 
 * TRAGE DEINE DATEN HIER EIN:
 * Die Hochkommas ' ' müssen bestehen bleiben!
 */
const HARDCODED_URL = 'https://clctsnmcbyurstknvpvv.supabase.co'; 
const HARDCODED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsY3Rzbm1jYnl1cnN0a252cHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNjUwMDgsImV4cCI6MjA4NDY0MTAwOH0.PGIglaaXssjYdzvYa2k3Zoilq_dolWdubRFESdFSxQI';

const getEnv = (name: string): string => {
  // 1. Zuerst prüfen wir die hartcodierten Werte oben
  if (name === 'SUPABASE_URL' && HARDCODED_URL) return HARDCODED_URL;
  if (name === 'SUPABASE_ANON_KEY' && HARDCODED_KEY) return HARDCODED_KEY;

  // 2. Danach prüfen wir Umgebungsvariablen (für Hosting wie Vercel/Netlify)
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env[name]) return process.env[name] as string;
      if (process.env[`VITE_${name}`]) return process.env[`VITE_${name}`] as string;
    }
  } catch (e) {}
  
  // 3. Fallback auf localStorage (falls im Browser eingegeben)
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(`APP_${name}`) || '';
  }
  
  return '';
};

// Hier rufen wir getEnv nur mit dem NAMEN der Variable auf
export const SUPABASE_URL = getEnv('SUPABASE_URL');
export const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY');

export const isSupabaseConfigured = 
  SUPABASE_URL.trim().length > 0 && 
  SUPABASE_ANON_KEY.trim().length > 0;

export const saveSupabaseConfig = (url: string, key: string) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('APP_SUPABASE_URL', url.trim());
    localStorage.setItem('APP_SUPABASE_ANON_KEY', key.trim());
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }
};
