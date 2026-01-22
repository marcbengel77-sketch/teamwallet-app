
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useRef } from 'react';
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
  const [loadingTeams, setLoadingTeams] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const refreshTeams = useCallback(async () => {
    if (user) {
      setLoadingTeams(true);
      try {
        const teams = await getUserTeams(user.id);
        setUserTeams(teams);

        if (teams && teams.length > 0) {
          setSelectedTeam(prev => {
            if (!prev || !teams.some(team => team.id === prev.id)) {
              return teams[0];
            }
            return prev;
          });
        } else {
          setSelectedTeam(null);
        }
      } catch (error) {
        console.error('Error fetching user teams (check if memberships table exists):', error);
        setUserTeams([]);
        setSelectedTeam(null);
      } finally {
        setLoadingTeams(false);
      }
    } else {
      setUserTeams([]);
      setSelectedTeam(null);
      setLoadingTeams(false);
    }
  }, [user]);

  useEffect(() => {
    if (!sessionLoading) {
      refreshTeams();
    }
  }, [user, sessionLoading, refreshTeams]);

  useEffect(() => {
    const fetchMembershipAndRole = async () => {
      if (user && selectedTeam) {
        try {
          const membership = await getUserMembershipForTeam(user.id, selectedTeam.id);
          setUserRole(membership ? membership.role : null);
          
          const memberships = await getTeamMemberships(selectedTeam.id);
          setUserMemberships(memberships);
        } catch (error) {
          console.error('Error fetching team details:', error);
          setUserRole(null);
          setUserMemberships([]);
        }
      } else {
        setUserRole(null);
        setUserMemberships([]);
      }
    };

    fetchMembershipAndRole();
  }, [user, selectedTeam]);

  const selectTeam = (teamId: string) => {
    const team = userTeams.find(t => t.id === teamId);
    if (team) {
      setSelectedTeam(team);
    }
  };

  const isAdmin = userRole === UserRole.Admin;
  const isViceAdmin = userRole === UserRole.ViceAdmin || isAdmin;

  const value = {
    selectedTeam,
    userTeams,
    userMemberships,
    selectTeam,
    loadingTeams,
    refreshTeams,
    userRole,
    isAdmin,
    isViceAdmin,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};
