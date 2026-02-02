
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
    const trimmedName = teamName.trim();
    if (!trimmedName) {
      setError('Bitte geben Sie einen Teamnamen ein.');
      return;
    }

    setLocalLoading(true);
    setError(null);

    // Sicherheits-Timeout für die UI
    const timeout = setTimeout(() => {
      if (localLoading) {
        setLocalLoading(false);
        setError('Die Anfrage dauert ungewöhnlich lange. Bitte prüfe dein Supabase SQL-Setup (Rekursions-Fix).');
      }
    }, 10000);

    try {
      console.log("Starte Team-Erstellung...");
      await createTeam(trimmedName, user.id);
      console.log("Team erstellt, lade Teams neu...");
      await refreshTeams(); 
      console.log("Redirect zum Dashboard...");
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error('Failed to create team:', err);
      setError(err.message || 'Fehler beim Erstellen des Teams. Hast du das neue SQL-Skript ausgeführt?');
    } finally {
      clearTimeout(timeout);
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
    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 min-h-screen">
      <div className="w-full max-w-lg bg-white p-10 rounded-3xl shadow-2xl border border-slate-100 relative">
        <h2 className="text-4xl font-black text-center text-slate-900 mb-4 tracking-tight">Team einrichten</h2>
        <p className="text-center text-slate-500 mb-8 font-medium leading-relaxed max-w-sm mx-auto">
          Erstellen Sie Ihr erstes Team, um mit der Verwaltung Ihrer Kasse zu beginnen.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-5 rounded-2xl mb-8 font-bold text-sm text-center animate-in fade-in slide-in-from-top-2 duration-300">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateTeam} className="space-y-8">
          <div>
            <label htmlFor="teamName" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
              Name der Gruppe / des Teams
            </label>
            <input
              type="text"
              id="teamName"
              className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl text-base font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:font-normal placeholder:text-slate-300"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
              disabled={localLoading}
              placeholder="z.B. Testteam"
            />
          </div>
          
          <div className="pt-2">
            <button
              type="submit"
              className={`w-full relative overflow-hidden bg-indigo-500/80 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:cursor-not-allowed`}
              disabled={localLoading}
            >
              <div className="relative z-10 flex items-center justify-center gap-3">
                {localLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="opacity-90">Wird erstellt...</span>
                  </>
                ) : (
                  <span>Team jetzt erstellen</span>
                )}
              </div>
            </button>
          </div>
        </form>
      </div>
      
      {/* Dekorative Elemente im Hintergrund */}
      <div className="fixed -bottom-24 -left-24 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed -top-24 -right-24 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
    </div>
  );
};

export default InitialSetup;
