
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { Team, Membership, UserRole, TeamContextType } from '../types';
import { useAuth } from './AuthContext';
import { getUserTeams, getUserMembershipForTeam, getTeamMemberships } from '../services/teamService';

const TeamContext = createContext<TeamContextType | undefined>(undefined);

interface TeamProviderProps {
  children: ReactNode;
}

export const TeamProvider: React.FC<TeamProviderProps> = ({ children }) => {
  const { user, sessionLoading } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [userMemberships, setUserMemberships] = useState<Membership[]>([]);
  const [loadingTeams, setLoadingTeams] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const refreshTeams = useCallback(async () => {
    if (!user) {
      setUserTeams([]);
      setSelectedTeam(null);
      return;
    }

    setLoadingTeams(true);
    try {
      const teams = await getUserTeams(user.id);
      setUserTeams(teams || []);

      if (teams && teams.length > 0) {
        setSelectedTeam(prev => {
          if (prev && teams.some(t => t.id === prev.id)) return prev;
          return teams[0];
        });
      } else {
        setSelectedTeam(null);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Teams:', error);
      setUserTeams([]);
    } finally {
      setLoadingTeams(false);
    }
  }, [user]);

  useEffect(() => {
    if (!sessionLoading) {
      refreshTeams();
    }
  }, [user, sessionLoading, refreshTeams]);

  useEffect(() => {
    const fetchTeamDetails = async () => {
      if (user && selectedTeam) {
        try {
          const [membership, allMemberships] = await Promise.all([
            getUserMembershipForTeam(user.id, selectedTeam.id),
            getTeamMemberships(selectedTeam.id)
          ]);
          setUserRole(membership?.role || null);
          setUserMemberships(allMemberships || []);
        } catch (error) {
          console.error('Fehler beim Laden der Team-Details:', error);
        }
      }
    };

    fetchTeamDetails();
  }, [user, selectedTeam]);

  const selectTeam = (teamId: string) => {
    const team = userTeams.find(t => t.id === teamId);
    if (team) setSelectedTeam(team);
  };

  const value = {
    selectedTeam,
    userTeams,
    userMemberships,
    selectTeam,
    loadingTeams,
    refreshTeams,
    userRole,
    isAdmin: userRole === UserRole.Admin,
    isViceAdmin: userRole === UserRole.Admin || userRole === UserRole.ViceAdmin,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam muss innerhalb eines TeamProviders verwendet werden');
  }
  return context;
};
