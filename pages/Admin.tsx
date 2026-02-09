
import React, { useState, useEffect } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { updateMemberRole, updateTeam, deleteTeam } from '../services/teamService';
import { UserRole } from '../types';
import { useNavigate } from 'react-router-dom';

const Admin: React.FC = () => {
  const { selectedTeam, userMemberships, isAdmin, isViceAdmin, refreshTeams, loadingTeams } = useTeam();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string>('');
  const [paypalHandle, setPaypalHandle] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (selectedTeam) {
      setTeamName(selectedTeam.name);
      setPaypalHandle(selectedTeam.paypal_handle || '');
    }
  }, [selectedTeam]);

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !isViceAdmin) return;
    setUpdating(true);
    setError(null);
    try {
      await updateTeam(selectedTeam.id, { 
        name: teamName, 
        paypal_handle: paypalHandle.trim() 
      });
      await refreshTeams();
      setSuccessMessage('Einstellungen gespeichert!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleRoleChange = async (membershipId: string, newRole: UserRole) => {
    if (!isAdmin) {
      alert("Nur der Haupt-Admin darf Rollen vergeben.");
      return;
    }
    try {
      await updateMemberRole(membershipId, newRole);
      await refreshTeams();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeam || !isAdmin) return;
    
    const confirmName = window.prompt(`ACHTUNG: Dies löscht "${selectedTeam.name}" unwiderruflich. Bestätige durch Eingabe des Teamnamens:`);
    
    if (confirmName !== selectedTeam.name) {
      alert("Abgebrochen. Name stimmt nicht überein.");
      return;
    }

    setDeleting(true);
    try {
      await deleteTeam(selectedTeam.id);
      await refreshTeams();
      navigate('/setup');
    } catch (err: any) {
      setError("Fehler beim Löschen: " + err.message);
      setDeleting(false);
    }
  };

  if (loadingTeams) return <div className="mt-40 flex justify-center"><LoadingSpinner /></div>;

  if (!isViceAdmin) return (
    <div className="mt-40 text-center p-8 bg-white max-w-md mx-auto rounded-3xl shadow-sm border border-slate-100 mx-4">
      <div className="text-5xl mb-4">🚫</div>
      <h2 className="text-xl font-black text-slate-800 mb-2">Zugriff verweigert</h2>
      <p className="text-slate-500 text-sm">Diese Seite ist Admins vorbehalten.</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 pt-36 sm:pt-40 pb-10">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">Verwaltung</h2>
        <p className="text-slate-500 font-medium">Systemeinstellungen für dein Team.</p>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-bold text-sm border border-red-100">{error}</div>}
      {successMessage && <div className="bg-green-50 text-green-600 p-4 rounded-xl mb-6 font-bold text-sm border border-green-100">{successMessage}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-1 space-y-6 sm:space-y-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xl">🛠️</span>
              <h3 className="text-lg font-black text-slate-800">Team-Info</h3>
            </div>
            <form onSubmit={handleUpdateTeam} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Teamname</label>
                <input type="text" className="w-full bg-slate-50 border-none p-4 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={teamName} onChange={e => setTeamName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">PayPal-Ziel</label>
                <input type="text" className="w-full bg-slate-50 border-none p-4 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={paypalHandle} onChange={e => setPaypalHandle(e.target.value)} placeholder="z.B. kasse@verein.de" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-100" disabled={updating}>
                {updating ? 'Speichert...' : 'Speichern'}
              </button>
            </form>
          </div>

          {isAdmin && (
            <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
              <h3 className="text-sm font-black text-red-700 uppercase tracking-widest mb-2">Team löschen</h3>
              <p className="text-[11px] text-red-600 mb-4 font-medium leading-relaxed">Alle Daten, Strafen und Kassenstände werden unwiderruflich entfernt.</p>
              <button 
                onClick={handleDeleteTeam}
                disabled={deleting}
                className="w-full bg-white border border-red-200 text-red-600 py-3 rounded-xl text-xs font-bold hover:bg-red-600 hover:text-white transition-all shadow-sm"
              >
                {deleting ? 'Lösche...' : 'Komplettes Team löschen'}
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛡️</span>
              <h3 className="text-lg font-black text-slate-800">Berechtigungen</h3>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Kollege</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Rolle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {userMemberships.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-900 truncate max-w-[150px] sm:max-w-none">{m.user_profile?.full_name || 'Unbekannt'}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter truncate max-w-[150px] sm:max-w-none">{m.user_profile?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {m.user_id !== user?.id && isAdmin ? (
                        <select 
                          className="bg-slate-50 border-none text-[10px] font-black p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 cursor-pointer uppercase tracking-widest"
                          value={m.role}
                          onChange={e => handleRoleChange(m.id, e.target.value as UserRole)}
                        >
                          <option value={UserRole.Member}>Mitglied</option>
                          <option value={UserRole.ViceAdmin}>Vize</option>
                          <option value={UserRole.Admin}>Admin</option>
                        </select>
                      ) : (
                        <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest ${m.role === 'admin' ? 'bg-purple-100 text-purple-700' : (m.role === 'vice_admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500')}`}>
                          {m.role === 'admin' ? 'Admin' : (m.role === 'vice_admin' ? 'Vize' : 'Mitglied')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
