
import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import { LoadingSpinner } from './LoadingSpinner';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, sessionLoading } = useAuth();
  const { selectedTeam, loadingTeams, userTeams } = useTeam();

  if (sessionLoading || loadingTeams) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user has no teams, redirect to setup
  if (userTeams.length === 0 && !selectedTeam && window.location.hash !== '#/setup') {
    return <Navigate to="/setup" replace />;
  }

  // If user has teams but no team is selected (shouldn't happen with the logic in TeamContext, but as a fallback)
  if (userTeams.length > 0 && !selectedTeam && window.location.hash !== '#/setup') {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
};
