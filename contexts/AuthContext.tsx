
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { User as FirebaseAuthUser } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getCurrentUserProfile, updateUserProfileData } from '../services/authService';
import { UserProfile, AuthContextType } from '../types';
import { PREMIUM_FEATURES } from '../constants';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseAuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isPremiumUser = userProfile?.isPremium || false;

  const fetchUserProfile = useCallback(async (user: FirebaseAuthUser) => {
    const profile = await getCurrentUserProfile(user.uid);
    setUserProfile(profile);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserProfile]);

  const logout = useCallback(async () => {
    await auth.signOut();
    setCurrentUser(null);
    setUserProfile(null);
  }, []);

  const updateUserProfile = useCallback(async (displayName: string, avatarFile: File | null) => {
    if (currentUser) {
      setLoading(true);
      try {
        const updatedProfile = await updateUserProfileData(currentUser.uid, displayName, avatarFile);
        setUserProfile(updatedProfile);
        // Force Firebase Auth user object refresh if display name or photoURL updated directly on it
        await currentUser.reload();
        setCurrentUser(auth.currentUser); // Get the reloaded user object
      } catch (error) {
        console.error("Failed to update user profile:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    }
  }, [currentUser]);

  const value = {
    currentUser,
    userProfile,
    loading,
    logout,
    updateUserProfile,
    isPremiumUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};