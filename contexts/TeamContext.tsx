
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useMemo, useRef } from 'react';
import { Team, Membership, UserRole, TeamContextType } from '../types';
import { useAuth } from './AuthContext';
import { getUserTeams, getUserMembershipForTeam, getTeamMemberships } from '../services/teamService';

const TeamContext = createContext<TeamContextType | undefined>(undefined);

interface TeamProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = 'teamwallet_last_team_id';

export const TeamProvider: React.FC<TeamProviderProps> = ({ children }) => {
  const { user, sessionLoading } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [userMemberships, setUserMemberships] = useState<Membership[]>([]);
  const [loadingTeams, setLoadingTeams] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  
  // Ref um unnötige Re-Renders der Callback-Funktion zu vermeiden
  const isInitialLoad = useRef(true);

  const refreshTeams = useCallback(async (forceLoading = true) => {
    if (!user) {
      setUserTeams([]);
      setSelectedTeam(null);
      setUserRole(null);
      setLoadingTeams(false);
      return;
    }

    if (forceLoading) setLoadingTeams(true);
    
    try {
      console.log("Starte Team-Synchronisierung für User:", user.id);
      const teams = await getUserTeams(user.id);
      setUserTeams(teams || []);

      if (teams && teams.length > 0) {
        const lastId = localStorage.getItem(STORAGE_KEY);
        // Finde das Team: Entweder das zuletzt genutzte, das aktuell selektierte oder das erste in der Liste
        const teamToSelect = (lastId ? teams.find(t => t.id === lastId) : null) || 
                             (selectedTeam ? (teams.find(t => t.id === selectedTeam.id) || teams[0]) : teams[0]);
        
        setSelectedTeam(teamToSelect);
        localStorage.setItem(STORAGE_KEY, teamToSelect.id);

        // Details parallel laden
        try {
          const [membership, allMemberships] = await Promise.all([
            getUserMembershipForTeam(user.id, teamToSelect.id),
            getTeamMemberships(teamToSelect.id)
          ]);
          setUserRole(membership?.role || null);
          setUserMemberships(allMemberships || []);
        } catch (detailError) {
          console.warn('Team-Details konnten nicht vollständig geladen werden:', detailError);
        }
      } else {
        setSelectedTeam(null);
        setUserRole(null);
        setUserMemberships([]);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('Kritischer Fehler beim Team-Sync:', error);
    } finally {
      setLoadingTeams(false);
    }
  }, [user?.id]); // Abhängigkeit auf selectedTeam.id entfernt, um Loops zu vermeiden

  useEffect(() => {
    let mounted = true;
    
    // Sicherheits-Timeout: Wenn nach 6 Sekunden die Teams nicht geladen sind, Ladekreis erzwingen zu schließen
    const safetyTimer = setTimeout(() => {
      if (mounted && loadingTeams) {
        console.warn("Team-Sync Sicherheits-Timeout erreicht.");
        setLoadingTeams(false);
      }
    }, 6000);

    if (!sessionLoading) {
      if (user) {
        refreshTeams(isInitialLoad.current);
        isInitialLoad.current = false;
      } else {
        setLoadingTeams(false);
      }
    }

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
    };
  }, [user?.id, sessionLoading, refreshTeams]);

  const selectTeam = async (teamId: string) => {
    const team = userTeams.find(t => t.id === teamId);
    if (!team || !user) return;
    
    setLoadingTeams(true);
    setSelectedTeam(team);
    localStorage.setItem(STORAGE_KEY, team.id);
    
    try {
      const [membership, allMemberships] = await Promise.all([
        getUserMembershipForTeam(user.id, team.id),
        getTeamMemberships(team.id)
      ]);
      setUserRole(membership?.role || null);
      setUserMemberships(allMemberships || []);
    } catch (e) {
      console.error("Fehler beim Teamwechsel:", e);
    } finally {
      setLoadingTeams(false);
    }
  };

  const { isAdmin, isViceAdmin } = useMemo(() => {
    if (!selectedTeam || !user) return { isAdmin: false, isViceAdmin: false };
    const creatorIsAdmin = selectedTeam.created_by === user.id;
    const dbIsAdmin = userRole === UserRole.Admin;
    const dbIsVice = userRole === UserRole.ViceAdmin;
    const admin = creatorIsAdmin || dbIsAdmin;
    const vice = admin || dbIsVice;
    return { isAdmin: admin, isViceAdmin: vice };
  }, [userRole, selectedTeam, user?.id]);

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
  if (context === undefined) throw new Error('useTeam muss innerhalb eines TeamProviders verwendet werden');
  return context;
};
