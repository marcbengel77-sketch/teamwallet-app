
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { isSupabaseConfigured, saveSupabaseConfig, SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { AuthContextType, UserProfile } from '../types';
import { signInWithEmail, signUpWithEmail, signInWithGoogle, signOut, getUserProfile, createOrUpdateUserProfile } from '../services/authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessionLoading, setSessionLoading] = useState<boolean>(true);
  const [initError, setInitError] = useState<string | null>(null);
  
  const [showSetup, setShowSetup] = useState(!isSupabaseConfigured);
  const [setupUrl, setSetupUrl] = useState(SUPABASE_URL);
  const [setupKey, setSetupKey] = useState(SUPABASE_ANON_KEY);

  const refreshProfile = useCallback(async (currentUser: User) => {
    if (!supabase) return;
    try {
      let userProfile = await getUserProfile(currentUser.id);
      if (!userProfile) {
        userProfile = await createOrUpdateUserProfile(
          currentUser.id, 
          currentUser.email || '', 
          currentUser.user_metadata?.full_name || currentUser.email
        );
      }
      setProfile(userProfile);
    } catch (error) {
      console.warn('Profil konnte nicht synchronisiert werden (App startet trotzdem):', error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured || !supabase) {
      if (mounted) setSessionLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session?.user && mounted) {
          setUser(session.user);
          // WICHTIG: Wir starten das Profil-Laden im Hintergrund und warten NICHT darauf
          refreshProfile(session.user);
        }
      } catch (error: any) {
        console.error('Auth-Initialisierung fehlgeschlagen:', error);
        if (mounted) setInitError(error.message);
      } finally {
        if (mounted) setSessionLoading(false);
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      if (session?.user) {
        setUser(session.user);
        refreshProfile(session.user);
      } else {
        setUser(null);
        setProfile(null);
      }
      setSessionLoading(false);
    });

    return () => {
      mounted = false;
      if (authListener) authListener.subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (setupUrl && setupKey) {
      saveSupabaseConfig(setupUrl, setupKey);
      setShowSetup(false);
    }
  };

  if (showSetup) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200">
          <div className="text-center mb-8">
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚙️</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Datenbank-Verbindung</h1>
            <p className="text-slate-500 text-sm">Bitte gib deine Supabase-Zugangsdaten ein.</p>
          </div>
          <form onSubmit={handleSaveConfig} className="space-y-5">
            <input type="url" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Project URL" value={setupUrl} onChange={(e) => setSetupUrl(e.target.value)} required />
            <input type="password" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" placeholder="Anon Key" value={setupKey} onChange={(e) => setSetupKey(e.target.value)} required />
            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95">Verbindung testen</button>
          </form>
        </div>
      </div>
    );
  }

  const value = {
    user,
    profile,
    sessionLoading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    refreshProfile: () => user ? refreshProfile(user) : Promise.resolve(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
