
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import { getInviteDetails, joinWithToken } from '../services/inviteService';
import { LoadingSpinner } from '../components/LoadingSpinner';

const JoinTeam: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
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
        setError("Einladungstoken fehlt.");
        setLoading(false);
        return;
      }
      try {
        const data = await getInviteDetails(token);
        if (!data) {
          setError("Dieser Link ist leider ungültig oder abgelaufen.");
        } else {
          setInviteData(data);
        }
      } catch {
        setError("Fehler beim Laden der Einladung.");
      }
      setLoading(false);
    }
    loadInvite();
  }, [token]);

  const handleJoinAction = async () => {
    if (!user) {
      // Wenn nicht eingeloggt, zur Auth Seite schicken mit returnTo Pfad
      const currentPath = location.pathname + location.search;
      navigate(`/auth?returnTo=${encodeURIComponent(currentPath)}`);
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

  if (loading || (sessionLoading && !inviteData)) return <div className="mt-40 flex justify-center"><LoadingSpinner /></div>;

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50 min-h-screen">
      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl shadow-2xl border border-slate-100 text-center relative overflow-hidden">
        {/* Dekorative Elemente */}
        <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
        
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-6 tracking-tight">Team-Einladung</h1>
        
        {error ? (
          <div className="mt-4">
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-8 font-bold text-sm border border-red-100 leading-relaxed">
              {error}
            </div>
            <button 
              onClick={() => navigate('/dashboard')} 
              className="text-white bg-indigo-600 px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 active:scale-95 transition-all"
            >
              Zum Dashboard
            </button>
          </div>
        ) : (
          <>
            <div className="my-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner transform rotate-3">
                🤝
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Du wurdest eingeladen zu</p>
              <h2 className="text-3xl font-black text-indigo-600 break-words px-4 leading-tight">
                {inviteData?.team?.name}
              </h2>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleJoinAction}
                disabled={joining}
                className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 text-lg"
              >
                {joining ? 'Wird verarbeitet...' : (user ? 'Team jetzt beitreten' : 'Registrieren & Beitreten')}
              </button>
              
              {!user && (
                <p className="text-xs text-slate-400 font-medium">
                  Du hast bereits ein Konto? <button onClick={handleJoinAction} className="text-indigo-600 font-bold underline">Login</button>
                </p>
              )}
            </div>
            
            <div className="mt-12 pt-6 border-t border-slate-50">
              <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                Einladung gültig bis: {new Date(inviteData?.expires_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default JoinTeam;
