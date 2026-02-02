
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import { getInviteDetails, joinWithToken } from '../services/inviteService';
import { LoadingSpinner } from '../components/LoadingSpinner';

const JoinTeam: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, sessionLoading } = useAuth();
  const { refreshTeams, selectTeam } = useTeam();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    async function loadInvite() {
      if (!token) {
        setError("Kein Einladungstoken gefunden.");
        setLoading(false);
        return;
      }
      const data = await getInviteDetails(token);
      if (!data) {
        setError("Dieser Einladungslink ist ungültig oder abgelaufen.");
      } else {
        setInviteData(data);
      }
      setLoading(false);
    }
    loadInvite();
  }, [token]);

  const handleJoin = async () => {
    if (!user) {
      // Speichere aktuellen Link für Redirect nach Login
      navigate(`/auth?returnTo=${encodeURIComponent(window.location.hash.substring(1))}`);
      return;
    }

    setJoining(true);
    try {
      const result = await joinWithToken(token!);
      if (result.success) {
        await refreshTeams();
        selectTeam(result.team_id);
        navigate('/dashboard');
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || "Fehler beim Beitritt.");
    } finally {
      setJoining(false);
    }
  };

  if (loading || sessionLoading) return <div className="mt-32 flex justify-center"><LoadingSpinner /></div>;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 min-h-screen">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center">
        <h1 className="text-3xl font-black text-indigo-600 mb-2">Team-Einladung</h1>
        
        {error ? (
          <div className="mt-4">
            <p className="text-red-500 font-bold mb-6">{error}</p>
            <button onClick={() => navigate('/dashboard')} className="text-indigo-600 font-bold">Zum Dashboard</button>
          </div>
        ) : (
          <>
            <div className="my-8">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🤝</div>
              <p className="text-slate-600">Du wurdest eingeladen, dem Team</p>
              <h2 className="text-2xl font-black text-slate-900 mt-1">"{inviteData?.team?.name}"</h2>
              <p className="text-slate-600">beizutreten.</p>
            </div>

            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {joining ? 'Wird verarbeitet...' : (user ? 'Jetzt Team beitreten' : 'Anmelden & Beitreten')}
            </button>
            
            <p className="mt-6 text-xs text-slate-400">Einladungslink gültig bis {new Date(inviteData?.expires_at).toLocaleDateString()}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default JoinTeam;
