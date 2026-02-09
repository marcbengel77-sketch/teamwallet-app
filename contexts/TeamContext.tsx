
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useMemo, useRef } from 'react';
import { Team, Membership, UserRole, TeamContextType } from '../types';
import { useAuth } from './AuthContext';
import { getUserTeams, getUserMembershipForTeam, getTeamMemberships } from '../services/teamService';
import { syncInvites } from '../services/inviteService';

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
      // Zuerst Einladungen prüfen/synchronisieren
      await syncInvites();

      const teams = await getUserTeams(user.id);
      const safeTeams = teams || [];
      setUserTeams(safeTeams);

      if (safeTeams.length > 0) {
        const lastId = localStorage.getItem(STORAGE_KEY);
        const teamToSelect = (lastId ? safeTeams.find(t => t.id === lastId) : null) || 
                             (selectedTeam ? (safeTeams.find(t => t.id === selectedTeam.id) || safeTeams[0]) : safeTeams[0]);
        
        if (teamToSelect) {
          setSelectedTeam(teamToSelect);
          localStorage.setItem(STORAGE_KEY, teamToSelect.id);

          try {
            const [membership, allMemberships] = await Promise.all([
              getUserMembershipForTeam(user.id, teamToSelect.id),
              getTeamMemberships(teamToSelect.id)
            ]);
            setUserRole(membership?.role || null);
            setUserMemberships(allMemberships || []);
          } catch (detailError) {
            console.warn('[TeamContext] Team-Details konnten nicht geladen werden:', detailError);
          }
        }
      } else {
        setSelectedTeam(null);
        setUserRole(null);
        setUserMemberships([]);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('[TeamContext] Fehler beim Synchronisieren der Teams:', error);
    } finally {
      setLoadingTeams(false);
    }
  }, [user?.id]);

  useEffect(() => {
    let mounted = true;
    const safetyTimer = setTimeout(() => {
      if (mounted && loadingTeams) {
        setLoadingTeams(false);
      }
    }, 4000);

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
      console.error("[TeamContext] Fehler beim Teamwechsel:", e);
    } finally {
      setLoadingTeams(false);
    }
  };

  const { isAdmin, isViceAdmin } = useMemo(() => {
    if (!selectedTeam || !user) return { isAdmin: false, isViceAdmin: false };
    const admin = selectedTeam.created_by === user.id || userRole === UserRole.Admin;
    const vice = admin || userRole === UserRole.ViceAdmin;
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
