
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading: authLoading } = useAuth();
  const { selectedTeamId, loading: teamLoading } = useTeam();
  const location = useLocation();

  if (authLoading || teamLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If user is authenticated but has no teams, they might need to create one or join.
  // For now, redirect to a dashboard that handles this state.
  // A more robust solution might involve a dedicated "no teams" page.
  if (!selectedTeamId && location.pathname !== '/team-settings') { // Allow accessing team settings to create a new team
     return <Navigate to="/team-settings" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
