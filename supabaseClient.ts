
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from './constants';

// Der Client wird nur erstellt, wenn die Konfiguration vorhanden ist.
// Wir exportieren null, wenn die Config fehlt, und fangen das im AuthContext ab.
export const supabase = isSupabaseConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;
