
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { createTeam } from '../services/teamService';

const InitialSetup: React.FC = () => {
  const { user, sessionLoading } = useAuth();
  const { userTeams, loadingTeams, refreshTeams } = useTeam();
  const navigate = useNavigate();

  const [teamName, setTeamName] = useState<string>('');
  const [localLoading, setLocalLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Automatischer Redirect, wenn Teams vorhanden sind
  useEffect(() => {
    if (!sessionLoading && !loadingTeams && userTeams.length > 0) {
      console.log("Redirecting to dashboard because team exists");
      navigate('/dashboard', { replace: true });
    }
  }, [userTeams, navigate, sessionLoading, loadingTeams]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Sie müssen angemeldet sein, um ein Team zu erstellen.');
      return;
    }
    const trimmedName = teamName.trim();
    if (!trimmedName) {
      setError('Bitte geben Sie einen Teamnamen ein.');
      return;
    }

    setLocalLoading(true);
    setError(null);
    try {
      console.log("Starting team creation...");
      await createTeam(trimmedName, user.id);
      console.log("Team created, refreshing context...");
      await refreshTeams(); 
      // Der useEffect oben wird den Redirect übernehmen, sobald userTeams aktualisiert ist.
      // Sicherheitshalber triggern wir die Navigation hier aber auch direkt.
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error('Failed to create team:', err);
      setError(err.message || 'Fehler beim Erstellen des Teams. Bitte prüfen Sie Ihre Datenbank-Berechtigungen (RLS).');
    } finally {
      setLocalLoading(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 min-h-screen mt-16">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Erstes Team einrichten</h2>
        <p className="text-center text-gray-600 mb-6">
          Erstellen Sie Ihr erstes Team, um mit der Verwaltung Ihrer Mannschaftskasse zu beginnen.
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateTeam} className="space-y-4">
          <div>
            <label htmlFor="teamName" className="block text-gray-700 text-sm font-bold mb-2">
              Teamname
            </label>
            <input
              type="text"
              id="teamName"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
              disabled={localLoading}
              placeholder="Z.B. FC Musterstadt 2025/26"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition duration-200 disabled:opacity-50"
            disabled={localLoading}
          >
            {localLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Team wird erstellt...
              </div>
            ) : 'Team erstellen'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-xl font-bold text-center text-gray-800 mb-2">Hilfe nötig?</h3>
          <p className="text-center text-sm text-gray-500">
            Stellen Sie sicher, dass Sie den SQL-Code im Supabase Dashboard ausgeführt haben, um die nötigen Berechtigungen zu setzen.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InitialSetup;
