
import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import { LoadingSpinner } from './LoadingSpinner';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, sessionLoading } = useAuth();
  const { loadingTeams, userTeams } = useTeam();
  const location = useLocation();

  // Nur beim allerersten Laden der Session zeigen wir den Vollbild-Spinner
  if (sessionLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  // Wenn kein User da ist -> Login
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // WARTEN: Wenn die Teams noch geladen werden, zeigen wir den Spinner
  // anstatt sofort zum Setup weiterzuleiten.
  if (loadingTeams && userTeams.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-500 font-medium">Lade deine Team-Daten...</p>
        </div>
      </div>
    );
  }

  // Wenn der User nachweislich keine Teams hat und nicht auf der Setup-Seite ist -> zum Setup zwingen
  if (!loadingTeams && userTeams.length === 0 && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
};
