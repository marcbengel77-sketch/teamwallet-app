
import React, { useState } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';
import { addMemberToTeam, removeMemberFromTeam, AddMemberResponse } from '../services/memberService';
import { createInviteToken } from '../services/inviteService';
import { UserRole } from '../types';

const Members: React.FC = () => {
  const { selectedTeam, userMemberships, isViceAdmin, refreshTeams, loadingTeams } = useTeam();
  const { user } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState<boolean>(false);
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberEmail, setNewMemberEmail] = useState<string>('');
  const [addingMember, setAddingMember] = useState<boolean>(false);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  
  // State für den Einladungs-Workflow
  const [inviteResult, setInviteResult] = useState<AddMemberResponse | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !user) return;
    setAddingMember(true);
    setError(null);
    try {
      const response = await addMemberToTeam(selectedTeam.id, newMemberEmail, newMemberName, UserRole.Member);
      
      if (response.status === 'added') {
        await refreshTeams(); 
        setIsAddMemberModalOpen(false);
        setNewMemberName('');
        setNewMemberEmail('');
      } else {
        // Mitglied muss eingeladen werden
        setInviteResult(response);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddingMember(false);
    }
  };

  const sendInviteEmail = (response: AddMemberResponse) => {
    if (!response.token || !selectedTeam) return;
    
    const baseUrl = window.location.origin + window.location.pathname;
    const fullLink = `${baseUrl}#/join?token=${response.token}`;
    
    const subject = encodeURIComponent(`Einladung zu TeamWallet: Tritt dem Team "${selectedTeam.name}" bei`);
    const body = encodeURIComponent(
      `Hallo!\n\nDu wurdest eingeladen, dem Team "${selectedTeam.name}" in der TeamWallet App beizutreten. Über diesen Link kannst du dich registrieren und wirst direkt Mitglied:\n\n${fullLink}\n\nBis bald in der Kabine!`
    );
    
    window.location.href = `mailto:${response.email}?subject=${subject}&body=${body}`;
    
    // Modal schließen nach dem Klick
    setIsAddMemberModalOpen(false);
    setInviteResult(null);
    setNewMemberName('');
    setNewMemberEmail('');
  };

  const handleRemoveMember = async (membershipId: string, name: string) => {
    const isSelf = userMemberships.find(m => m.id === membershipId)?.user_id === user?.id;
    const msg = isSelf 
      ? "Möchtest du das Team wirklich verlassen?" 
      : `Möchtest du ${name} wirklich aus dem Team entfernen?`;

    if (!window.confirm(msg)) return;
    
    setDeletingMemberId(membershipId);
    try {
      await removeMemberFromTeam(membershipId);
      await refreshTeams();
      if (isSelf) window.location.href = '/';
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

  if (loadingTeams) return <div className="mt-40 flex justify-center"><LoadingSpinner /></div>;
  if (!selectedTeam) return <div className="mt-40 text-center p-4">Kein Team ausgewählt.</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 pt-36 sm:pt-40 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Teammitglieder</h2>
          <p className="text-slate-500 text-sm font-medium">{selectedTeam.name} • {userMemberships.length} Personen</p>
        </div>
        {isViceAdmin && (
          <button
            onClick={() => {
              setInviteResult(null);
              setIsAddMemberModalOpen(true);
            }}
            className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all text-sm active:scale-95"
          >
            Neu +
          </button>
        )}
      </div>

      {isViceAdmin && !inviteLink && (
        <div className="mb-6">
          <button
            onClick={handleGenerateInvite}
            disabled={generatingLink}
            className="w-full bg-white border-2 border-dashed border-indigo-100 text-indigo-600 p-5 rounded-2xl font-bold text-sm hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 group"
          >
            {generatingLink ? <LoadingSpinner /> : (
              <>
                <span className="group-hover:scale-110 transition-transform">🔗</span>
                Allgemeinen Einladungslink erstellen
              </>
            )}
          </button>
        </div>
      )}

      {inviteLink && (
        <div className="mb-6 bg-indigo-600 text-white p-6 rounded-2xl shadow-xl animate-in zoom-in duration-300">
          <div className="flex justify-between items-center mb-3">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Manueller Link</p>
            <button onClick={() => setInviteLink(null)} className="text-white/60 hover:text-white">&times;</button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input 
              type="text" 
              readOnly 
              value={inviteLink} 
              className="flex-grow bg-indigo-700 border-none px-4 py-3 rounded-xl text-xs text-white outline-none font-mono"
            />
            <button 
              onClick={() => { navigator.clipboard.writeText(inviteLink); alert("Kopiert!"); }}
              className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold text-xs whitespace-nowrap active:scale-95"
            >
              Kopieren
            </button>
          </div>
        </div>
      )}

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-bold text-sm border border-red-100">{error}</div>}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {userMemberships.length === 0 ? (
            <div className="p-16 text-center text-slate-400 italic font-medium">Noch keine Mitglieder.</div>
          ) : (
            userMemberships.map((m) => (
              <div key={m.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black text-white shrink-0 shadow-sm ${m.role === 'admin' ? 'bg-purple-500' : (m.role === 'vice_admin' ? 'bg-indigo-500' : 'bg-slate-400')}`}>
                    {(m.user_profile?.full_name || 'U').charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">{m.user_profile?.full_name || 'Unbekannt'}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                       <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter ${
                         m.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                         (m.role === 'vice_admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500')
                       }`}>
                        {m.role === 'admin' ? 'Admin' : (m.role === 'vice_admin' ? 'Vize' : 'Mitglied')}
                      </span>
                      {m.user_id === user?.id && <span className="text-[9px] font-bold text-slate-300 uppercase italic">(Ich)</span>}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {(isViceAdmin || m.user_id === user?.id) && (
                    <button
                      onClick={() => handleRemoveMember(m.id, m.user_profile?.full_name || 'Mitglied')}
                      disabled={deletingMemberId === m.id}
                      className="text-slate-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all"
                      title="Entfernen"
                    >
                      {deletingMemberId === m.id ? <div className="w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin"></div> : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal isOpen={isAddMemberModalOpen} onClose={() => setIsAddMemberModalOpen(false)} title={inviteResult ? "Einladung bereit" : "Mitglied hinzufügen"}>
        {!inviteResult ? (
          <form onSubmit={handleAddMember} className="space-y-4">
            <input type="text" placeholder="Name (Anzeige)" className="w-full bg-slate-50 border-none p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} required />
            <input type="email" placeholder="E-Mail" className="w-full bg-slate-50 border-none p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} required />
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold transition-all hover:bg-indigo-700 shadow-lg active:scale-95" disabled={addingMember}>
              {addingMember ? 'Wird geprüft...' : 'Prüfen & Hinzufügen'}
            </button>
          </form>
        ) : (
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">📧</div>
            <p className="text-slate-600 text-sm mb-6 font-medium leading-relaxed">
              Dieses Mitglied ist noch nicht bei TeamWallet registriert. Eine personalisierte Einladung wurde erstellt.
            </p>
            <button 
              onClick={() => sendInviteEmail(inviteResult)} 
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>E-Mail jetzt senden</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
            <button onClick={() => setIsAddMemberModalOpen(false)} className="mt-4 text-slate-400 text-xs font-bold hover:text-slate-600 uppercase tracking-widest">Später machen</button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Members;
