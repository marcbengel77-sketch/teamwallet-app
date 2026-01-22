
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { isSupabaseConfigured, saveSupabaseConfig } from '../constants';
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
  
  // Setup State
  const [showSetup, setShowSetup] = useState(!isSupabaseConfigured);
  const [setupUrl, setSetupUrl] = useState('');
  const [setupKey, setSetupKey] = useState('');

  const refreshProfile = useCallback(async (currentUser: User) => {
    if (!supabase) return;
    try {
      // Wir versuchen das Profil zu laden. Dank des Triggers sollte es existieren.
      let userProfile = await getUserProfile(currentUser.id);
      
      // Falls der Trigger (extrem unwahrscheinlich) noch nicht fertig war,
      // versuchen wir es manuell via Upsert.
      if (!userProfile) {
        userProfile = await createOrUpdateUserProfile(
          currentUser.id, 
          currentUser.email || '', 
          currentUser.user_metadata?.full_name || currentUser.email
        );
      }
      
      setProfile(userProfile);
    } catch (error) {
      console.error('Fehler beim Laden des Profils:', error);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setSessionLoading(false);
      return;
    }

    let mounted = true;

    const initAuth = async () => {
      setSessionLoading(true);
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session?.user && mounted) {
          setUser(session.user);
          await refreshProfile(session.user);
        }
      } catch (error) {
        console.error('Initialer Auth-Check fehlgeschlagen:', error);
      } finally {
        if (mounted) setSessionLoading(false);
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (session?.user) {
        setUser(session.user);
        await refreshProfile(session.user);
      } else {
        setUser(null);
        setProfile(null);
      }
      setSessionLoading(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (setupUrl && setupKey) {
      saveSupabaseConfig(setupUrl, setupKey);
    }
  };

  if (showSetup) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-indigo-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full border border-indigo-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-indigo-900 mb-2">Teamkasse Setup</h1>
            <p className="text-gray-600">Bitte gib deine Supabase Verbindungsdaten ein, um die App zu starten.</p>
          </div>
          
          <form onSubmit={handleSaveConfig} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Supabase URL</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="https://xyz.supabase.co"
                value={setupUrl}
                onChange={(e) => setSetupUrl(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Anon Key</label>
              <input 
                type="password" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="eyJhbGciOiJIUzI1Ni..."
                value={setupKey}
                onChange={(e) => setSetupKey(e.target.value)}
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg transform active:scale-95 transition-all"
            >
              Konfiguration speichern
            </button>
          </form>
          
          <div className="mt-6 text-xs text-gray-400 text-center">
            Die Daten werden lokal in deinem Browser gespeichert.
          </div>
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
  if (context === undefined) {
    throw new Error('useAuth muss innerhalb eines AuthProviders verwendet werden');
  }
  return context;
};
