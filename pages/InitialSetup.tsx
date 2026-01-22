
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
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && !loadingTeams && userTeams.length > 0) {
      navigate('/dashboard', { replace: true });
    }
  }, [userTeams, navigate, sessionLoading, loadingTeams]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Sie müssen angemeldet sein, um ein Team zu erstellen.');
      return;
    }
    if (!teamName.trim()) {
      setError('Bitte geben Sie einen Teamnamen ein.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await createTeam(teamName, user.id);
      await refreshTeams(); // Force refresh teams to get the new team
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error('Failed to create team:', err);
      setError(err.message || 'Fehler beim Erstellen des Teams.');
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading || loadingTeams) {
    return (
      <div className="flex justify-center items-center min-h-screen mt-24">
        <LoadingSpinner />
      </div>
    );
  }

  // If user is logged in and has teams, but somehow landed here, redirect
  if (user && userTeams.length > 0) {
    return <></>; // Navigate will handle it via useEffect
  }

  if (!user) {
    return (
      <div className="container mx-auto mt-24 p-4 text-center text-red-600">
        <p>Sie müssen angemeldet sein, um diesen Bereich zu sehen.</p>
        <button onClick={() => navigate('/auth')} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">
          Zur Anmeldung
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 min-h-screen mt-24">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Erstes Team einrichten</h2>
        <p className="text-center text-gray-600 mb-6">
          Sie sind derzeit keinem Team zugeordnet. Erstellen Sie Ihr erstes Team, um fortzufahren.
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
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
              disabled={loading}
              placeholder="Z.B. FC Musterstadt 2025/26"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
            disabled={loading}
          >
            {loading ? <LoadingSpinner /> : 'Team erstellen'}
          </button>
        </form>

        {/* Optional: Bereich zum Beitreten eines Teams, falls ein Code vorhanden ist */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-xl font-bold text-center text-gray-800 mb-4">Oder einem Team beitreten</h3>
          <p className="text-center text-gray-600">
            Wenn Sie einen Einladungscode haben, können Sie hier einem bestehenden Team beitreten. (Diese Funktion ist in dieser Version nicht implementiert.)
          </p>
          <button
            className="w-full bg-gray-400 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4 cursor-not-allowed"
            disabled
          >
            Team beitreten (inaktiv)
          </button>
        </div>
      </div>
    </div>
  );
};

export default InitialSetup;
