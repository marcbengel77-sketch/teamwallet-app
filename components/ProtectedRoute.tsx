
import React, { useEffect, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import { LoadingSpinner } from './LoadingSpinner';

// Added ReactNode to imports to fix the missing type definition error
interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, sessionLoading } = useAuth();
  const { loadingTeams, userTeams } = useTeam();
  const location = useLocation();

  // 1. Auth-Initialisierung abwarten
  if (sessionLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  // 2. Login-Check
  if (!user) {
    return <Navigate to={`/auth?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  // 3. Team-Lade-Zustand abwarten
  if (loadingTeams) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-slate-500 font-bold animate-pulse text-sm">Synchronisiere Mannschaftsdaten...</p>
        </div>
      </div>
    );
  }

  const isJoining = location.pathname.startsWith('/join');
  const isSetup = location.pathname === '/setup';

  // 4. Wenn keine Teams da sind, ab zum Setup (außer man ist schon dort oder tritt gerade bei)
  if (userTeams.length === 0 && !isSetup && !isJoining) {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
};
