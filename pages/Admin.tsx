
import React, { useState, useEffect, useCallback } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { updateMemberRole, updateTeam, checkPremium } from '../services/teamService';
import { Membership, UserRole } from '../types';

const Admin: React.FC = () => {
  const { selectedTeam, userMemberships, isAdmin, refreshTeams } = useTeam();
  const { user } = useAuth();

  const [loading, setLoading] = useState<boolean>(false);
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
    setLoading(true);
    try {
      await updateMemberRole(membershipId, newRole);
      await refreshTeams();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return <div className="mt-24 text-center text-red-500 font-bold">Zugriff verweigert.</div>;

  return (
    <div className="container mx-auto mt-24 p-4">
      <h2 className="text-3xl font-bold mb-8">Admin-Bereich</h2>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {successMessage && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{successMessage}</div>}

      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h3 className="text-xl font-bold mb-4">Team-Konfiguration</h3>
        <form onSubmit={handleUpdateTeam} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1 text-gray-700">Teamname</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded-lg" 
              value={teamName} 
              onChange={e => setTeamName(e.target.value)} 
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1 text-gray-700">PayPal Konto (E-Mail oder PayPal.Me Name)</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded-lg" 
              value={paypalHandle} 
              onChange={e => setPaypalHandle(e.target.value)}
              placeholder="z.B. kassenwart@verein.de"
            />
            <p className="text-xs text-gray-500 mt-1 italic">Mitglieder sehen einen PayPal-Button bei ihren Strafen, wenn hier ein Konto hinterlegt ist.</p>
          </div>
          <button 
            type="submit" 
            className="bg-indigo-600 text-white py-2 px-6 rounded-lg font-bold disabled:opacity-50"
            disabled={updating}
          >
            {updating ? 'Speichere...' : 'Änderungen speichern'}
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-bold mb-4">Mitglieder verwalten</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-gray-500 text-sm uppercase">
                <th className="pb-2">Name</th>
                <th className="pb-2">Rolle</th>
                <th className="pb-2">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {userMemberships.map(m => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="py-3 font-medium">{m.user_profile?.full_name || 'Unbekannt'}</td>
                  <td className="py-3"><span className="text-xs font-bold uppercase bg-gray-100 px-2 py-1 rounded">{m.role}</span></td>
                  <td className="py-3">
                    {m.user_id !== user?.id && (
                      <select 
                        className="text-xs border rounded p-1"
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
  );
};

export default Admin;
