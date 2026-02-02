
import React, { useState } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';
import { addMemberToTeam, removeMemberFromTeam } from '../services/memberService';
import { createInviteToken } from '../services/inviteService';
import { UserRole } from '../types';

const Members: React.FC = () => {
  const { selectedTeam, userMemberships, isAdmin, refreshTeams } = useTeam();
  const { user } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState<boolean>(false);
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberEmail, setNewMemberEmail] = useState<string>('');
  const [addingMember, setAddingMember] = useState<boolean>(false);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !user) return;
    setAddingMember(true);
    setError(null);
    try {
      await addMemberToTeam(selectedTeam.id, newMemberEmail, newMemberName, UserRole.Member);
      await refreshTeams(); 
      setIsAddMemberModalOpen(false);
      setNewMemberName('');
      setNewMemberEmail('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (membershipId: string, name: string) => {
    if (!window.confirm(`Möchtest du ${name} wirklich aus dem Team entfernen? Alle zugehörigen Berechtigungen gehen verloren.`)) return;
    
    setDeletingMemberId(membershipId);
    try {
      await removeMemberFromTeam(membershipId);
      await refreshTeams();
    } catch (err: any) {
      alert("Fehler beim Entfernen: " + err.message);
    } finally {
      setDeletingMemberId(null);
    }
  };

  const handleGenerateInvite = async () => {
    if (!selectedTeam) return;
    setGeneratingLink(true);
    try {
      const token = await createInviteToken(selectedTeam.id);
      const baseUrl = window.location.origin + window.location.pathname;
      const fullLink = `${baseUrl}#/join?token=${token}`;
      setInviteLink(fullLink);
    } catch (err: any) {
      alert("Fehler beim Erstellen des Links: " + err.message);
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      alert("Link kopiert!");
    }
  };

  if (!selectedTeam) return <div className="mt-32 text-center p-4">Kein Team ausgewählt.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 pt-32 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">Mitglieder</h2>
          <p className="text-slate-500 text-sm font-medium">{userMemberships.length} Teamkollegen</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsAddMemberModalOpen(true)}
            className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all text-sm"
          >
            Mitglied hinzufügen
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="mb-8 bg-indigo-50 border border-indigo-100 p-6 rounded-2xl">
          <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest mb-2">Schnell-Einladung via Link</h3>
          <p className="text-xs text-indigo-700 mb-4">Teile diesen Link mit deinen Teamkollegen. Sie können dem Team damit direkt beitreten.</p>
          
          {inviteLink ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="text" 
                readOnly 
                value={inviteLink} 
                className="flex-grow bg-white border border-indigo-200 px-4 py-3 rounded-xl text-xs text-slate-600 outline-none"
              />
              <button 
                onClick={copyToClipboard}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all"
              >
                Kopieren
              </button>
              <button 
                onClick={() => setInviteLink(null)}
                className="text-indigo-600 text-xs font-bold hover:underline px-2"
              >
                Neu erstellen
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateInvite}
              disabled={generatingLink}
              className="bg-white border border-indigo-200 text-indigo-600 px-6 py-3 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-all flex items-center gap-2"
            >
              {generatingLink ? <LoadingSpinner /> : 'Einladungslink generieren 🔗'}
            </button>
          )}
        </div>
      )}

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-bold text-sm">{error}</div>}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">E-Mail</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Rolle</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {userMemberships.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{m.user_profile?.full_name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{m.user_profile?.email || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-tighter ${m.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                      {m.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end items-center gap-2">
                      <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg mr-2">Aktiv</span>
                      {isAdmin && m.user_id !== user?.id && (
                        <button
                          onClick={() => handleRemoveMember(m.id, m.user_profile?.full_name || 'dieses Mitglied')}
                          disabled={deletingMemberId === m.id}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Mitglied entfernen"
                        >
                          {deletingMemberId === m.id ? (
                            <div className="w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isAddMemberModalOpen} onClose={() => setIsAddMemberModalOpen(false)} title="Team erweitern">
        <form onSubmit={handleAddMember} className="space-y-4">
          <p className="text-xs text-slate-500 mb-2 italic">Hinweis: Das manuelle Hinzufügen funktioniert nur für Nutzer, die bereits registriert sind. Nutze für neue Nutzer lieber den Einladungslink oben.</p>
          <input type="text" placeholder="Name des Spielers" className="w-full bg-slate-50 border-none p-4 rounded-xl text-sm" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} required />
          <input type="email" placeholder="E-Mail Adresse" className="w-full bg-slate-50 border-none p-4 rounded-xl text-sm" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} required />
          <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold transition-all hover:bg-indigo-700" disabled={addingMember}>
            {addingMember ? 'Wird hinzugefügt...' : 'Mitglied jetzt hinzufügen'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Members;
