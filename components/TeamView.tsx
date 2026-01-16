
import React, { useState, useMemo } from 'react';
import { UserProfile, Role, TeamMember } from '../types';
import { mockMembers, mockUsers, mockTeams, mockPenaltyCategories } from '../lib/mockData';
import { Shield, UserPlus, Settings, Trash2, Edit2, Check, Copy, Search, MoreVertical } from 'lucide-react';

interface TeamViewProps {
  activeTeamId: string;
  currentUser: UserProfile;
  role: Role;
  addToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const TeamView: React.FC<TeamViewProps> = ({ activeTeamId, currentUser, role, addToast }) => {
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'catalog' | 'settings'>('members');
  const [memberSearch, setMemberSearch] = useState('');
  const [copied, setCopied] = useState(false);

  const teamMembers = useMemo(() => {
    const memberships = mockMembers.filter(m => m.teamId === activeTeamId);
    let users = memberships.map(m => {
      const user = mockUsers.find(u => u.id === m.userId)!;
      return { ...user, role: m.role };
    });
    
    if (memberSearch) {
      users = users.filter(u => u.name.toLowerCase().includes(memberSearch.toLowerCase()));
    }
    return users;
  }, [activeTeamId, memberSearch]);

  const copyInvite = () => {
    const link = `https://teamwallet.app/join/${activeTeamId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    addToast("Einladungslink kopiert!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const isAdmin = role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Team</h2>
        <button 
          onClick={copyInvite}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100"
        >
          {copied ? <Check size={18} /> : <UserPlus size={18} />}
          <span className="hidden sm:inline">{copied ? 'Kopiert' : 'Einladen'}</span>
        </button>
      </div>

      <div className="flex p-1 bg-slate-200/50 rounded-xl w-fit">
        <button 
          onClick={() => setActiveSubTab('members')}
          className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'members' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Mitglieder
        </button>
        <button 
          onClick={() => setActiveSubTab('catalog')}
          className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'catalog' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Katalog
        </button>
        {isAdmin && (
          <button 
            onClick={() => setActiveSubTab('settings')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'settings' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Settings
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {activeSubTab === 'members' && (
          <div className="p-4 md:p-6 space-y-6">
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
              {teamMembers.map(member => (
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
                  {isAdmin && member.id !== currentUser.id && (
                    <button className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition opacity-0 group-hover:opacity-100">
                      <MoreVertical size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === 'catalog' && (
          <div className="p-4 md:p-6 divide-y">
            {mockPenaltyCategories.map(cat => (
              <div key={cat.id} className="py-5 flex justify-between items-start first:pt-0 last:pb-0">
                <div className="max-w-[75%]">
                  <p className="font-bold text-slate-800">{cat.name}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{cat.description}</p>
                </div>
                <div className="bg-blue-50 px-3 py-1 rounded-full">
                  <p className="font-black text-blue-600 text-sm">{cat.amount.toFixed(2)}€</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSubTab === 'settings' && isAdmin && (
          <div className="p-6 space-y-8">
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Allgemein</h3>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 ml-1">Team-Name</label>
                <input 
                  type="text" 
                  defaultValue={mockTeams.find(t => t.id === activeTeamId)?.name} 
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
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
      </div>
    </div>
  );
};
