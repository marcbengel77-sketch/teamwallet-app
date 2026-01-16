
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Role, TeamMember, PenaltyCategory } from '../types';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Shield, UserPlus, Settings, Trash2, Edit2, Check, Copy, Search, MoreVertical, Loader2, Plus, Info, X } from 'lucide-react';

interface TeamViewProps {
  activeTeamId: string;
  currentUser: UserProfile;
  addToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const TeamView: React.FC<TeamViewProps> = ({ activeTeamId, currentUser, addToast }) => {
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'catalog' | 'settings' | 'create'>('members');
  const [memberSearch, setMemberSearch] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [categories, setCategories] = useState<PenaltyCategory[]>([]);
  const [newCat, setNewCat] = useState({ name: '', amount: '', description: '' });

  useEffect(() => {
    if (!activeTeamId) return;
    const unsubRole = onSnapshot(doc(db, `teams/${activeTeamId}/members/${currentUser.id}`), (doc) => {
      if (doc.exists()) setRole(doc.data().role as Role);
    });
    const unsubMembers = onSnapshot(collection(db, `teams/${activeTeamId}/members`), async (snapshot) => {
      const list: TeamMember[] = [];
      for (const mDoc of snapshot.docs) {
        const uDoc = await getDoc(doc(db, 'users', mDoc.id));
        if (uDoc.exists()) list.push({ id: mDoc.id, ...uDoc.data(), role: mDoc.data().role } as TeamMember);
      }
      setMembers(list);
      setLoading(false);
    });
    const unsubCats = onSnapshot(collection(db, `teams/${activeTeamId}/catalog`), (snapshot) => {
      setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PenaltyCategory)));
    });
    return () => { unsubRole(); unsubMembers(); unsubCats(); };
  }, [activeTeamId, currentUser.id]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.name || !newCat.amount) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, `teams/${activeTeamId}/catalog`), {
        name: newCat.name,
        amount: parseFloat(newCat.amount),
        description: newCat.description
      });
      addToast("Strafe zum Katalog hinzugefügt.");
      setNewCat({ name: '', amount: '', description: '' });
      setShowAddCategory(false);
    } catch (e) { addToast("Fehler beim Speichern.", "error"); }
    finally { setIsSubmitting(false); }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Soll diese Strafe wirklich aus dem Katalog gelöscht werden?")) return;
    try {
      await deleteDoc(doc(db, `teams/${activeTeamId}/catalog/${id}`));
      addToast("Kategorie entfernt.");
    } catch (e) { addToast("Fehler beim Löschen.", "error"); }
  };

  const changeMemberRole = async (memberId: string, newRole: Role) => {
    try {
      await updateDoc(doc(db, `teams/${activeTeamId}/members/${memberId}`), { role: newRole });
      addToast("Rolle aktualisiert.");
    } catch (e) { addToast("Fehler beim Ändern der Rolle.", "error"); }
  };

  const isAdmin = role === 'admin' || role === 'vice-admin';

  return (
    <div className="space-y-6">
      <div className="flex p-1 bg-slate-200/50 rounded-xl w-fit overflow-x-auto">
        <TabButton active={activeSubTab === 'members'} onClick={() => setActiveSubTab('members')} label="Mitglieder" />
        <TabButton active={activeSubTab === 'catalog'} onClick={() => setActiveSubTab('catalog')} label="Katalog" />
        {role === 'admin' && <TabButton active={activeSubTab === 'settings'} onClick={() => setActiveSubTab('settings')} label="Settings" />}
        <TabButton active={activeSubTab === 'create'} onClick={() => setActiveSubTab('create')} label="+ Neu" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {activeSubTab === 'catalog' && (
          <div className="p-4 md:p-6 space-y-6">
            <div className="flex justify-between items-center">
               <h3 className="font-bold text-slate-800">Strafenkatalog</h3>
               {isAdmin && (
                 <button onClick={() => setShowAddCategory(true)} className="flex items-center gap-2 text-blue-600 font-bold text-sm bg-blue-50 px-3 py-2 rounded-xl hover:bg-blue-100 transition">
                   <Plus size={16} /> Neu
                 </button>
               )}
            </div>
            <div className="grid gap-4">
              {categories.map(cat => (
                <div key={cat.id} className="p-4 rounded-xl border border-slate-100 flex justify-between items-center group">
                  <div>
                    <p className="font-bold text-slate-800">{cat.name}</p>
                    <p className="text-xs text-slate-400 font-medium">{cat.description || 'Keine Beschreibung'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-black text-blue-600">{cat.amount.toFixed(2)}€</span>
                    {isAdmin && (
                      <button onClick={() => deleteCategory(cat.id)} className="p-2 text-slate-300 hover:text-red-500 transition">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === 'members' && (
          <div className="p-4 md:p-6 space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Mitglied suchen..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm" />
            </div>
            <div className="divide-y">
              {members.filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase())).map(member => (
                <div key={member.id} className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={member.avatarUrl} className="w-12 h-12 rounded-full object-cover shadow-sm" />
                    <div>
                      <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        {member.name}
                        {member.role === 'admin' && <Shield size={14} className="text-amber-500 fill-amber-500" />}
                        {member.role === 'vice-admin' && <Shield size={14} className="text-blue-500 fill-blue-500" />}
                      </p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{member.role}</p>
                    </div>
                  </div>
                  {role === 'admin' && member.id !== currentUser.id && (
                    <select 
                      value={member.role}
                      onChange={(e) => changeMemberRole(member.id, e.target.value as Role)}
                      className="text-xs font-bold border-none bg-slate-100 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="member">Mitglied</option>
                      <option value="vice-admin">Vize-Admin</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Modal for Catalog */}
        {showAddCategory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl animate-in zoom-in-95">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-lg font-bold">Neue Strafe anlegen</h3>
                <button onClick={() => setShowAddCategory(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddCategory} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Bezeichnung</label>
                  <input type="text" required value={newCat.name} onChange={(e) => setNewCat({...newCat, name: e.target.value})} placeholder="z.B. Tunnel kassiert" className="w-full p-3 rounded-xl bg-slate-100 border-none text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Betrag (€)</label>
                  <input type="number" step="0.01" required value={newCat.amount} onChange={(e) => setNewCat({...newCat, amount: e.target.value})} placeholder="0.00" className="w-full p-3 rounded-xl bg-slate-100 border-none text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Beschreibung (Optional)</label>
                  <textarea value={newCat.description} onChange={(e) => setNewCat({...newCat, description: e.target.value})} placeholder="Kurze Erklärung..." className="w-full p-3 rounded-xl bg-slate-100 border-none text-sm min-h-[80px]" />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : 'Katalog-Eintrag speichern'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, label: string }> = ({ active, onClick, label }) => (
  <button onClick={onClick} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${active ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
    {label}
  </button>
);
