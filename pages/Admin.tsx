
import React, { useState, useEffect, useCallback } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { updateMemberRole, updateTeam, checkPremium } from '../services/teamService';
import { Membership, UserRole } from '../types';

const Admin: React.FC = () => {
  const { selectedTeam, userMemberships, isAdmin, refreshTeams, userRole } = useTeam();
  const { user } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [teamName, setTeamName] = useState<string>(selectedTeam?.name || '');
  const [isPremium, setIsPremium] = useState<boolean>(selectedTeam?.is_premium || false);
  const [updatingTeamSettings, setUpdatingTeamSettings] = useState<boolean>(false);

  const fetchAdminData = useCallback(async () => {
    if (!selectedTeam) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      // All necessary data (userMemberships, selectedTeam) are already in TeamContext
      setTeamName(selectedTeam.name);
      // Den Premium-Status explizit über checkPremium abrufen
      const premiumStatus = await checkPremium(selectedTeam.id);
      setIsPremium(premiumStatus);
    } catch (err: any) {
      console.error('Failed to fetch admin data:', err);
      setError(err.message || 'Fehler beim Laden der Admin-Daten.');
    } finally {
      setLoading(false);
    }
  }, [selectedTeam]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchAdminData();
  }, [selectedTeam, fetchAdminData]);

  const handleRoleChange = async (membershipId: string, newRole: UserRole) => {
    if (!selectedTeam || !user || !isAdmin) {
      setError('Nicht autorisiert oder Team nicht ausgewählt.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await updateMemberRole(membershipId, newRole);
      await refreshTeams(); // Refreshes userMemberships in TeamContext
      setSuccessMessage('Rolle erfolgreich aktualisiert!');
    } catch (err: any) {
      console.error('Failed to update member role:', err);
      setError(err.message || 'Fehler beim Aktualisieren der Rolle.');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMessage(null), 3000); // Clear success message after 3 seconds
    }
  };

  const handleUpdateTeamSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !user || !isAdmin) {
      setError('Nicht autorisiert oder Team nicht ausgewählt.');
      return;
    }
    setUpdatingTeamSettings(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await updateTeam(selectedTeam.id, { name: teamName, is_premium: isPremium });
      await refreshTeams(); // Refresh selectedTeam in TeamContext
      setSuccessMessage('Team-Einstellungen erfolgreich aktualisiert!');
    } catch (err: any) {
      console.error('Failed to update team settings:', err);
      setError(err.message || 'Fehler beim Aktualisieren der Team-Einstellungen.');
    } finally {
      setUpdatingTeamSettings(false);
      setTimeout(() => setSuccessMessage(null), 3000); // Clear success message after 3 seconds
    }
  };

  if (!selectedTeam) {
    return (
      <div className="container mx-auto mt-24 p-4 text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Willkommen!</h2>
        <p className="text-lg text-gray-600">Bitte wählen Sie ein Team aus oder erstellen Sie ein neues Team im <a href="#/setup" className="text-indigo-600 hover:underline">Setup-Bereich</a>.</p>
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto mt-24 p-4 text-center text-red-600">
        <h2 className="text-3xl font-bold mb-4">Zugriff verweigert</h2>
        <p>Sie haben keine Administratorrechte für dieses Team, um auf diesen Bereich zuzugreifen.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto mt-24 p-4">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-24 p-4">
      <h2 className="text-4xl font-extrabold text-gray-900 mb-8 text-center">{selectedTeam.name} Admin-Bereich</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{successMessage}</span>
        </div>
      )}

      {/* Team-Einstellungen */}
      <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Team-Einstellungen</h3>
        <form onSubmit={handleUpdateTeamSettings} className="space-y-4">
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
              disabled={updatingTeamSettings}
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPremium"
              className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              checked={isPremium}
              onChange={(e) => setIsPremium(e.target.checked)}
              disabled={updatingTeamSettings}
            />
            <label htmlFor="isPremium" className="text-gray-700 text-sm font-bold">
              Premium-Funktionen aktivieren (z.B. PDF-Export)
            </label>
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
            disabled={updatingTeamSettings}
          >
            {updatingTeamSettings ? <LoadingSpinner /> : 'Einstellungen speichern'}
          </button>
        </form>
      </div>

      {/* Rollenverwaltung */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Rollenverwaltung</h3>
        {userMemberships.length === 0 ? (
          <p className="text-gray-600">Keine Mitglieder zur Verwaltung.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">Name</th>
                  <th className="py-3 px-6 text-left">E-Mail</th>
                  <th className="py-3 px-6 text-left">Aktuelle Rolle</th>
                  <th className="py-3 px-6 text-left">Neue Rolle</th>
                  <th className="py-3 px-6 text-left">Aktion</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm font-light">
                {userMemberships.map((membership) => (
                  <tr key={membership.id} className="border-b border-gray-200 hover:bg-gray-100">
                    <td className="py-3 px-6 text-left whitespace-nowrap">
                      {membership.user_profile?.full_name || 'N/A'}
                    </td>
                    <td className="py-3 px-6 text-left">{membership.user_profile?.email || 'N/A'}</td>
                    <td className="py-3 px-6 text-left">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                        ${membership.role === UserRole.Admin ? 'bg-purple-200 text-purple-800' : ''}
                        ${membership.role === UserRole.ViceAdmin ? 'bg-blue-200 text-blue-800' : ''}
                        ${membership.role === UserRole.Member ? 'bg-gray-200 text-gray-800' : ''}
                      `}>
                        {membership.role}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-left">
                      {membership.user_id === user?.id ? (
                        <span className="text-gray-500 italic">Ihre Rolle</span>
                      ) : (
                        <select
                          className="shadow border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-xs"
                          value={membership.role}
                          onChange={(e) => handleRoleChange(membership.id, e.target.value as UserRole)}
                          disabled={loading}
                        >
                          <option value={UserRole.Member}>Mitglied</option>
                          <option value={UserRole.ViceAdmin}>Vize-Admin</option>
                          {/* Admin role can only be assigned/removed by another admin, for simplicity,
                              we restrict assigning 'admin' role through this dropdown
                              to prevent accidental demotion of the only admin.
                              If user is already admin, they can change others but not their own to non-admin easily.
                              A specific 'transfer ownership' or 'demote admin' flow is more robust.
                          */}
                          {membership.role === UserRole.Admin && (
                            <option value={UserRole.Admin}>Admin</option>
                          )}
                        </select>
                      )}
                    </td>
                    <td className="py-3 px-6 text-left">
                      {membership.user_id !== user?.id && membership.role !== UserRole.Admin && (
                         <button
                         onClick={() => handleRoleChange(membership.id, UserRole.Admin)}
                         className="bg-purple-500 hover:bg-purple-600 text-white py-1 px-3 rounded-md text-xs transition duration-300 mr-2"
                         disabled={loading}
                       >
                         Zum Admin machen
                       </button>
                      )}
                      {membership.user_id !== user?.id && membership.role !== UserRole.Member && (
                        <button
                          onClick={() => handleRoleChange(membership.id, UserRole.Member)}
                          className="bg-gray-500 hover:bg-gray-600 text-white py-1 px-3 rounded-md text-xs transition duration-300"
                          disabled={loading}
                        >
                          Zum Mitglied machen
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
