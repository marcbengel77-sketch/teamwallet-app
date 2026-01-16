
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Role, TeamMember, PenaltyCategory } from '../types';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, getDoc, setDoc, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Shield, UserPlus, Settings, Trash2, Edit2, Check, Copy, Search, MoreVertical, Loader2, Plus, Info } from 'lucide-react';

interface TeamViewProps {
  activeTeamId: string;
  currentUser: UserProfile;
  addToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const TeamView: React.FC<TeamViewProps> = ({ activeTeamId, currentUser, addToast }) => {
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'catalog' | 'settings' | 'create'>('members');
  const [memberSearch, setMemberSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [role, setRole] = useState<Role>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New Team Form
  const [newTeamName, setNewTeamName] = useState('');
  
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [categories, setCategories] = useState<PenaltyCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // User Role Listener
  useEffect(() => {
    if (!activeTeamId) return;
    const unsubscribe = onSnapshot(doc(db, `teams/${activeTeamId}/members/${currentUser.id}`), (doc) => {
      if (doc.exists()) {
        setRole(doc.data().role as Role);
      }
    });
    return () => unsubscribe();
  }, [activeTeamId, currentUser.id]);

  // Members Listener
  useEffect(() => {
    if (!activeTeamId) {
        setLoading(false);
        return;
    }
    const q = collection(db, `teams/${activeTeamId}/members`);
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const memberList: TeamMember[] = [];
      for (const mDoc of snapshot.docs) {
        const uDoc = await getDoc(doc(db, 'users', mDoc.id));
        if (uDoc.exists()) {
          memberList.push({ id: mDoc.id, ...uDoc.data(), role: mDoc.data().role } as TeamMember);
        }
      }
      setMembers(memberList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [activeTeamId]);

  // Catalog Listener
  useEffect(() => {
    if (!activeTeamId) return;
    const q = collection(db, `teams/${activeTeamId}/catalog`);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PenaltyCategory)));
    });
    return () => unsubscribe();
  }, [activeTeamId]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    
    setIsSubmitting(true);
    try {
      // 1. Team-Dokument erstellen
      const teamRef = await addDoc(collection(db, 'teams'), {
        name: newTeamName,
        logoUrl: `https://picsum.photos/seed/${Math.random()}/200`,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.id
      });

      // 2. Ersteller als Admin hinzufügen
      await setDoc(doc(db, `teams/${teamRef.id}/members`, currentUser.id), {
        userId: currentUser.id,
        role: 'admin',
        joinedAt: new Date().toISOString()
      });

      // 3. Standard-Strafenkatalog anlegen
      const defaultCatalog = [
        { name: 'Zu spät zum Training', amount: 2.5, description: 'Pro angefangene 5 Min' },
        { name: 'Gelbe Karte (Meckern)', amount: 5.0, description: 'Unsportliches Verhalten' },
        { name: 'Handy in der Kabine', amount: 3.0, description: 'Stört die Konzentration' }
      ];

      for (const cat of defaultCatalog) {
        await addDoc(collection(db, `teams/${teamRef.id}/catalog`), cat);
      }

      addToast(`Team "${newTeamName}" wurde erfolgreich gegründet!`, "success");
      setNewTeamName('');
      setActiveSubTab('members');
    } catch (e) {
      console.error(e);
      addToast("Fehler beim Erstellen des Teams.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMembers = useMemo(() => {
    if (!memberSearch) return members;
    return members.filter(u => u.name.toLowerCase().includes(memberSearch.toLowerCase()));
  }, [members, memberSearch]);

  const copyInvite = () => {
    const link = `${window.location.origin}/join/${activeTeamId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    addToast("Einladungslink kopiert!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const isAdmin = role === 'admin' || role === 'vice-admin';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">
          {activeSubTab === 'create' ? 'Neues Team gründen' : 'Teamverwaltung'}
        </h2>
      </div>

      <div className="flex p-1 bg-slate-200/50 rounded-xl w-fit overflow-x-auto">
        <TabButton active={activeSubTab === 'members'} onClick={() => setActiveSubTab('members')} label="Mitglieder" />
        <TabButton active={activeSubTab === 'catalog'} onClick={() => setActiveSubTab('catalog')} label="Katalog" />
        {(role === 'admin') && <TabButton active={activeSubTab === 'settings'} onClick={() => setActiveSubTab('settings')} label="Settings" />}
        <TabButton active={activeSubTab === 'create'} onClick={() => setActiveSubTab('create')} label="+ Neu" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" /></div>
        ) : (
          <>
            {activeSubTab === 'members' && activeTeamId && (
              <div className="p-4 md:p-6 space-y-6">
                {/* Invite Card for Admins */}
                {isAdmin && (
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                        <UserPlus size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Mitglieder einladen</p>
                        <p className="text-xs text-slate-500">Teile den Link mit deinen Teamkollegen.</p>
                      </div>
                    </div>
                    <button 
                      onClick={copyInvite}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100 active:scale-95"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      <span>{copied ? 'Kopiert' : 'Link kopieren'}</span>
                    </button>
                  </div>
                )}

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Mitglied suchen..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
                
                <div className="grid gap-4">
                  {filteredMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 hover:bg-slate-50 transition group">
                      <div className="flex items-center gap-4">
                        <img src={member.avatarUrl} alt={member.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                        <div>
                          <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            {member.name}
                            {member.role === 'admin' && <Shield size={14} className="text-amber-500 fill-amber-500" />}
                            {member.role === 'vice-admin' && <Shield size={14} className="text-blue-500 fill-blue-500" />}
                          </p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{member.role}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredMembers.length === 1 && (
                  <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Info size={24} className="text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 font-medium">Du bist momentan das einzige Mitglied.<br/>Lade deine Teamkollegen ein!</p>
                  </div>
                )}
              </div>
            )}

            {activeSubTab === 'catalog' && activeTeamId && (
              <div className="p-4 md:p-6 divide-y">
                {categories.length > 0 ? categories.map(cat => (
                  <div key={cat.id} className="py-5 flex justify-between items-start first:pt-0 last:pb-0">
                    <div className="max-w-[75%]">
                      <p className="font-bold text-slate-800">{cat.name}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{cat.description}</p>
                    </div>
                    <div className="bg-blue-50 px-3 py-1 rounded-full">
                      <p className="font-black text-blue-600 text-sm">{cat.amount.toFixed(2)}€</p>
                    </div>
                  </div>
                )) : (
                  <div className="p-12 text-center text-slate-400 italic">Noch keine Strafen definiert.</div>
                )}
                {isAdmin && (
                  <button 
                    onClick={() => addToast("Katalog-Editor kommt bald!", "info")}
                    className="w-full mt-4 py-3 border-2 border-dashed rounded-xl text-slate-400 text-sm font-bold hover:bg-slate-50 transition"
                  >
                    + Neue Kategorie hinzufügen
                  </button>
                )}
              </div>
            )}

            {activeSubTab === 'create' && (
              <div className="p-6 max-w-md mx-auto space-y-8">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-4">
                    <Plus size={32} />
                  </div>
                  <h3 className="text-xl font-bold">Gründe dein Team</h3>
                  <p className="text-slate-500 text-sm">Als Gründer wirst du automatisch Admin und kannst später Einladungslinks generieren.</p>
                </div>

                <form onSubmit={handleCreateTeam} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 ml-1">Team-Name</label>
                    <input 
                      type="text" 
                      required
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="z.B. FC Bolzplatz"
                      className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={isSubmitting || !newTeamName.trim()}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Team jetzt gründen'}
                  </button>
                </form>
              </div>
            )}

            {activeSubTab === 'settings' && role === 'admin' && activeTeamId && (
              <div className="p-6 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Allgemein</h3>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 ml-1">Team-Name</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Team Name eingeben..."
                        className="flex-1 p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      />
                      <button className="bg-slate-100 p-3 rounded-xl text-slate-600 hover:bg-slate-200 transition"><Edit2 size={20} /></button>
                    </div>
                  </div>
                </div>
                
                <div className="pt-8 border-t">
                  <h3 className="text-sm font-black text-red-400 uppercase tracking-widest mb-4">Danger Zone</h3>
                  <button className="w-full sm:w-auto flex items-center justify-center gap-2 text-red-600 bg-red-50 px-6 py-3 rounded-xl font-bold hover:bg-red-100 transition text-sm">
                    <Trash2 size={18} /> Team auflösen
                  </button>
                </div>
              </div>
            )}

            {!activeTeamId && activeSubTab !== 'create' && (
              <div className="p-12 text-center">
                 <p className="text-slate-400">Kein Team ausgewählt.</p>
                 <button onClick={() => setActiveSubTab('create')} className="mt-4 text-blue-600 font-bold hover:underline">Jetzt eins gründen?</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, label: string }> = ({ active, onClick, label }) => (
  <button 
    onClick={onClick}
    className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${active ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
  >
    {label}
  </button>
);
