
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
    if (!user) return;
    const trimmedName = teamName.trim();
    if (!trimmedName) {
      setError('Bitte gib einen Namen für dein Team ein.');
      return;
    }

    setLocalLoading(true);
    setError(null);

    try {
      await createTeam(trimmedName, user.id);
      await refreshTeams(); 
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Fehler beim Erstellen des Teams.');
    } finally {
      setLocalLoading(false);
    }
  };

  if (sessionLoading) return <div className="flex justify-center items-center min-h-screen"><LoadingSpinner /></div>;

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50 min-h-screen overflow-hidden relative">
      <div className="w-full max-w-lg bg-white p-8 sm:p-12 rounded-[2.5rem] shadow-2xl border border-slate-100 relative z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl shadow-inner">🏆</div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">Erstes Team</h2>
          <p className="text-slate-500 font-medium leading-relaxed max-w-xs mx-auto text-sm">
            Starte jetzt deine digitale Mannschaftskasse.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl mb-8 font-bold text-xs text-center animate-in fade-in duration-300">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateTeam} className="space-y-8">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Teamname / Gruppenname</label>
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl text-base font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:font-normal placeholder:text-slate-300"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
              disabled={localLoading}
              placeholder="z.B. FC Beispiel United"
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50"
            disabled={localLoading}
          >
            {localLoading ? 'Erstellt...' : 'Jetzt Team gründen'}
          </button>
        </form>
      </div>
      
      <div className="fixed -bottom-48 -left-48 w-[40rem] h-[40rem] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed -top-48 -right-48 w-[40rem] h-[40rem] bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
    </div>
  );
};

export default InitialSetup;
