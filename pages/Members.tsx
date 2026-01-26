
import React, { useState, useEffect, useCallback } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';
import { addMemberToTeam } from '../services/memberService';
import { Membership, UserRole } from '../types';

const Members: React.FC = () => {
  const { selectedTeam, userMemberships, isAdmin, refreshTeams } = useTeam();
  const { user } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState<boolean>(false);
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberEmail, setNewMemberEmail] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<UserRole>(UserRole.Member);
  const [addingMember, setAddingMember] = useState<boolean>(false);

  const fetchMembers = useCallback(async () => {
    if (!selectedTeam) return;
    setLoading(true);
    setError(null);
    try {
      // Members are already loaded via useTeam -> userMemberships
    } catch (err: any) {
      console.error('Failed to fetch members:', err);
      setError(err.message || 'Fehler beim Laden der Mitglieder.');
    } finally {
      setLoading(false);
    }
  }, [selectedTeam]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchMembers();
  }, [selectedTeam, fetchMembers]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !user) {
      setError('Team nicht ausgewählt oder Benutzer nicht angemeldet.');
      return;
    }
    if (!newMemberName || !newMemberEmail) {
      setError('Bitte Name und E-Mail des neuen Mitglieds angeben.');
      return;
    }

    setAddingMember(true);
    setError(null);
    try {
      await addMemberToTeam(selectedTeam.id, newMemberEmail, newMemberName, newMemberRole);
      await refreshTeams(); // Refreshes userMemberships in TeamContext
      setIsAddMemberModalOpen(false);
      setNewMemberName('');
      setNewMemberEmail('');
      setNewMemberRole(UserRole.Member);
    } catch (err: any) {
      console.error('Failed to add member:', err);
      setError(err.message || 'Fehler beim Hinzufügen des Mitglieds.');
    } finally {
      setAddingMember(false);
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

  if (loading) {
    return (
      <div className="container mx-auto mt-24 p-4">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-24 p-4">
      <h2 className="text-4xl font-extrabold text-gray-900 mb-8 text-center">{selectedTeam.name} Mitglieder</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {isAdmin && (
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setIsAddMemberModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300"
          >
            Mitglied hinzufügen
          </button>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-lg">
        {userMemberships.length === 0 ? (
          <p className="text-gray-600">Noch keine Mitglieder in diesem Team.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">Name</th>
                  <th className="py-3 px-6 text-left">E-Mail</th>
                  <th className="py-3 px-6 text-left">Rolle</th>
                  <th className="py-3 px-6 text-left">Status</th>
                  <th className="py-3 px-6 text-left">Beitrittsdatum</th>
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
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                        ${membership.status === 'active' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}
                      `}>
                        {membership.status}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-left">
                      {new Date(membership.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal für Mitglied hinzufügen */}
      <Modal isOpen={isAddMemberModalOpen} onClose={() => setIsAddMemberModalOpen(false)} title="Mitglied hinzufügen">
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label htmlFor="newMemberName" className="block text-gray-700 text-sm font-bold mb-2">
              Name
            </label>
            <input
              type="text"
              id="newMemberName"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              required
              disabled={addingMember}
            />
          </div>
          <div>
            <label htmlFor="newMemberEmail" className="block text-gray-700 text-sm font-bold mb-2">
              E-Mail
            </label>
            <input
              type="email"
              id="newMemberEmail"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              required
              disabled={addingMember}
            />
          </div>
          <div>
            <label htmlFor="newMemberRole" className="block text-gray-700 text-sm font-bold mb-2">
              Rolle
            </label>
            <select
              id="newMemberRole"
              className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value as UserRole)}
              disabled={addingMember}
            >
              <option value={UserRole.Member}>Mitglied</option>
              <option value={UserRole.ViceAdmin}>Vize-Admin</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
            disabled={addingMember}
          >
            {addingMember ? <LoadingSpinner /> : 'Mitglied hinzufügen'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Members;
