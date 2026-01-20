
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { Team, TeamContextType, TeamMember } from '../types';
import { useAuth } from './AuthContext';
import {
  getUserTeams,
  getTeamById,
  getTeamMember,
  updateTeamMemberLastSeen,
  getUnreadNotificationsForUser
} from '../services/firestoreService';

export const TeamContext = createContext<TeamContextType | undefined>(undefined);

interface TeamProviderProps {
  children: React.ReactNode;
}

export const TeamProvider: React.FC<TeamProviderProps> = ({ children }) => {
  const { currentUser, loading: authLoading } = useAuth();
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedTeamMembership, setSelectedTeamMembership] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState<boolean>(false);

  const fetchUserTeams = useCallback(async () => {
    if (currentUser) {
      setLoading(true);
      try {
        const teams = await getUserTeams(currentUser.uid);
        setUserTeams(teams);

        // Auto-select first team if no team is selected or previously selected team is no longer available
        if (teams.length > 0 && (!selectedTeamId || !teams.some(team => team.id === selectedTeamId))) {
          setSelectedTeamId(teams[0].id);
        } else if (teams.length === 0) {
          setSelectedTeamId(null);
        }
      } catch (err) {
        setError("Failed to fetch user's teams.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    } else {
      setUserTeams([]);
      setSelectedTeamId(null);
      setSelectedTeam(null);
      setSelectedTeamMembership(null);
      setLoading(false);
    }
  }, [currentUser, selectedTeamId]);

  const fetchSelectedTeamData = useCallback(async () => {
    if (selectedTeamId && currentUser) {
      setLoading(true);
      try {
        const team = await getTeamById(selectedTeamId);
        const membership = await getTeamMember(selectedTeamId, currentUser.uid);
        setSelectedTeam(team);
        setSelectedTeamMembership(membership);

        if (!team || !membership) {
            setError("Selected team or membership not found.");
            setSelectedTeamId(null); // Clear selected team if not found
            // Re-fetch user teams to potentially pick a new default
            await fetchUserTeams();
        }
      } catch (err) {
        setError("Failed to fetch selected team data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    } else {
      setSelectedTeam(null);
      setSelectedTeamMembership(null);
      setLoading(false);
    }
  }, [selectedTeamId, currentUser, fetchUserTeams]);

  const checkNotifications = useCallback(async () => {
    if (selectedTeamId && currentUser) {
      const hasUnread = await getUnreadNotificationsForUser(selectedTeamId, currentUser.uid);
      setUnreadNotifications(hasUnread);
    } else {
      setUnreadNotifications(false);
    }
  }, [selectedTeamId, currentUser]);

  const clearUnreadNotifications = useCallback(async () => {
    setUnreadNotifications(false);
    // Optionally, mark all current notifications as read in the backend
    // This is handled by updateTeamMembershipLastSeen in specific pages.
  }, []);

  const updateTeamMembershipLastSeen = useCallback(async (type: 'dashboard' | 'fines' | 'expenses') => {
    if (selectedTeamId && currentUser) {
      await updateTeamMemberLastSeen(selectedTeamId, currentUser.uid, type);
      // After updating, re-check notifications to reflect the change
      await checkNotifications();
    }
  }, [selectedTeamId, currentUser, checkNotifications]);

  useEffect(() => {
    if (!authLoading) {
      fetchUserTeams();
    }
  }, [authLoading, fetchUserTeams]);

  useEffect(() => {
    if (selectedTeamId && currentUser) {
      fetchSelectedTeamData();
      checkNotifications(); // Check notifications when team changes
      const notificationInterval = setInterval(checkNotifications, 60000); // Check every minute
      return () => clearInterval(notificationInterval);
    }
  }, [selectedTeamId, currentUser, fetchSelectedTeamData, checkNotifications]);

  const selectTeam = useCallback((teamId: string) => {
    setSelectedTeamId(teamId);
    // Persist selected team ID in local storage or cookie if desired for reloads
    localStorage.setItem('selectedTeamId', teamId);
    setError(null); // Clear previous errors
  }, []);

  useEffect(() => {
    // Attempt to load selected team from local storage on initial mount
    const storedTeamId = localStorage.getItem('selectedTeamId');
    if (storedTeamId) {
        setSelectedTeamId(storedTeamId);
    }
  }, []);

  const refetchTeams = useCallback(async () => {
    await fetchUserTeams();
    await fetchSelectedTeamData(); // Ensure selected team data is also fresh
  }, [fetchUserTeams, fetchSelectedTeamData]);

  const value = {
    userTeams,
    selectedTeamId,
    selectedTeam,
    selectedTeamMembership,
    selectTeam,
    loading: loading || authLoading,
    error,
    refetchTeams,
    unreadNotifications,
    clearUnreadNotifications,
    updateTeamMembershipLastSeen,
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};