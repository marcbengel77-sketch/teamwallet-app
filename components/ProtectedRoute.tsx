
import React, { useEffect, useState, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import { LoadingSpinner } from './LoadingSpinner';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, sessionLoading } = useAuth();
  const { loadingTeams, userTeams, refreshTeams } = useTeam();
  const [showRetry, setShowRetry] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let timer: any;
    if (loadingTeams) {
      timer = setTimeout(() => setShowRetry(true), 4500);
    } else {
      setShowRetry(false);
    }
    return () => clearTimeout(timer);
  }, [loadingTeams]);

  if (sessionLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/auth?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (loadingTeams) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center px-4">
          <LoadingSpinner />
          <p className="mt-4 text-slate-500 font-bold animate-pulse text-sm">Synchronisiere Mannschaftsdaten...</p>
          
          {showRetry && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <p className="text-xs text-slate-400 mb-4 font-medium">Das dauert länger als gewöhnlich...</p>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => refreshTeams(true)}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-lg active:scale-95"
                >
                  Erneut versuchen
                </button>
                <button 
                  onClick={() => window.location.reload()}
                  className="text-slate-500 font-bold text-[10px] uppercase tracking-widest"
                >
                  Seite neu laden
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isJoining = location.pathname.startsWith('/join');
  const isSetup = location.pathname === '/setup';

  if (userTeams.length === 0 && !isSetup && !isJoining) {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
};
