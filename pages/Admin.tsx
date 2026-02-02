
import React, { useState, useEffect } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { updateMemberRole, updateTeam } from '../services/teamService';
import { UserRole } from '../types';

const Admin: React.FC = () => {
  const { selectedTeam, userMemberships, isAdmin, refreshTeams } = useTeam();
  const { user } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string>('');
  const [paypalHandle, setPaypalHandle] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);

  useEffect(() => {
    if (selectedTeam) {
      setTeamName(selectedTeam.name);
      setPaypalHandle(selectedTeam.paypal_handle || '');
    }
  }, [selectedTeam]);

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !isAdmin) return;
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
    try {
      await updateMemberRole(membershipId, newRole);
      await refreshTeams();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isAdmin) return <div className="mt-32 text-center p-4 text-red-500 font-bold">Zugriff verweigert.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 pt-32 pb-10">
      <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight mb-8">Admin-Konfiguration</h2>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-bold text-sm">{error}</div>}
      {successMessage && <div className="bg-green-50 text-green-600 p-4 rounded-xl mb-6 font-bold text-sm">{successMessage}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Team Settings */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
          <h3 className="text-lg font-black text-slate-800 mb-6">⚙️ Team-Einstellungen</h3>
          <form onSubmit={handleUpdateTeam} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Teamname</label>
              <input type="text" className="w-full bg-slate-50 border-none p-3 rounded-xl text-sm" value={teamName} onChange={e => setTeamName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">PayPal Link/Mail</label>
              <input type="text" className="w-full bg-slate-50 border-none p-3 rounded-xl text-sm" value={paypalHandle} onChange={e => setPaypalHandle(e.target.value)} placeholder="z.B. kassenwart@verein.de" />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50" disabled={updating}>
              {updating ? 'Speichere...' : 'Einstellungen speichern'}
            </button>
          </form>
        </div>

        {/* Member Management */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <h3 className="text-lg font-black text-slate-800">👥 Rollen & Rechte</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userMemberships.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-900">{m.user_profile?.full_name || 'Unbekannt'}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-black">{m.role}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {m.user_id !== user?.id && (
                        <select 
                          className="bg-slate-50 border-none text-[10px] font-bold p-2 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          value={m.role}
                          onChange={e => handleRoleChange(m.id, e.target.value as UserRole)}
                        >
                          <option value={UserRole.Member}>Mitglied</option>
                          <option value={UserRole.ViceAdmin}>Vize</option>
                          <option value={UserRole.Admin}>Admin</option>
                        </select>
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
