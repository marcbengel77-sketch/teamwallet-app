
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
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // Wenn kein User da ist -> Login
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // WICHTIG: Wir zeigen KEINEN Vollbild-Spinner mehr, wenn loadingTeams wahr ist,
  // es sei denn, wir haben noch gar keine Teams geladen und sind nicht im Setup.
  // Das verhindert, dass die InitialSetup-Komponente während des createTeam-Vorgangs unmounted wird.
  if (loadingTeams && userTeams.length === 0 && location.pathname !== '/setup') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // Wenn der User keine Teams hat und nicht auf der Setup-Seite ist -> zum Setup zwingen
  if (userTeams.length === 0 && location.pathname !== '/setup' && !loadingTeams) {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
};
