
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
  const [loadingTeams, setLoadingTeams] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  
  const lastUserIdRef = useRef<string | null>(null);

  const refreshTeams = useCallback(async (forceLoading = true) => {
    if (!user) {
      setUserTeams([]);
      setSelectedTeam(null);
      setLoadingTeams(false);
      lastUserIdRef.current = null;
      return;
    }

    if (forceLoading) setLoadingTeams(true);
    
    // Safety Timeout: Falls die DB-Anfrage hängen bleibt (z.B. RLS Loop)
    const safetyTimeout = setTimeout(() => {
      setLoadingTeams(false);
      console.warn("Team loading safety timeout reached.");
    }, 6000);

    try {
      const teams = await getUserTeams(user.id);
      setUserTeams(teams || []);
      lastUserIdRef.current = user.id;

      if (teams && teams.length > 0) {
        setSelectedTeam(prev => {
          if (prev) {
            const fresh = teams.find(t => t.id === prev.id);
            if (fresh) return fresh;
          }
          return teams[0];
        });
      } else {
        setSelectedTeam(null);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Teams:', error);
    } finally {
      clearTimeout(safetyTimeout);
      setLoadingTeams(false);
    }
  }, [user]);

  useEffect(() => {
    if (!sessionLoading) {
      const isNewUser = user?.id !== lastUserIdRef.current;
      if (isNewUser || (user && userTeams.length === 0 && !loadingTeams)) {
        refreshTeams(true);
      }
    }
  }, [user?.id, sessionLoading, refreshTeams]);

  useEffect(() => {
    let mounted = true;
    const fetchTeamDetails = async () => {
      if (user && selectedTeam) {
        try {
          const [membership, allMemberships] = await Promise.all([
            getUserMembershipForTeam(user.id, selectedTeam.id),
            getTeamMemberships(selectedTeam.id)
          ]);
          if (mounted) {
            setUserRole(membership?.role || null);
            setUserMemberships(allMemberships || []);
          }
        } catch (error) {
          console.error('Fehler beim Laden der Team-Details:', error);
        }
      } else if (!selectedTeam && mounted) {
        setUserRole(null);
        setUserMemberships([]);
      }
    };

    fetchTeamDetails();
    return () => { mounted = false; };
  }, [user?.id, selectedTeam?.id]);

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
