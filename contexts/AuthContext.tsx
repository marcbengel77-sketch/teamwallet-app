
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
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

  const refreshProfile = useCallback(async () => {
    if (user) {
      try {
        const userProfile = await getUserProfile(user.id);
        if (userProfile) {
          setProfile(userProfile);
        } else {
          // If profile doesn't exist (e.g., first time Google login), create it
          const newProfile = await createOrUpdateUserProfile(user.id, user.email || '', user.user_metadata.full_name || user.email);
          setProfile(newProfile);
        }
      } catch (error) {
        console.error('Error refreshing profile (check if profiles table exists):', error);
      }
    } else {
      setProfile(null);
    }
  }, [user]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSessionLoading(true);
      try {
        if (session?.user) {
          setUser(session.user);
          await refreshProfile();
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
      } finally {
        setSessionLoading(false);
      }
    });

    // Check initial session
    const checkSession = async () => {
      setSessionLoading(true);
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await refreshProfile();
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Initial session check error:', error);
      } finally {
        setSessionLoading(false);
      }
    };

    checkSession();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const value = {
    user,
    profile,
    sessionLoading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
