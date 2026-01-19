
import React, { useState, useEffect } from 'react';
import { UserProfile, Team, Role } from '../types';
import { LayoutDashboard, Users, User, ChevronDown, Bell, Link as LinkIcon, Check, Plus } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

interface LayoutProps {
  children: React.ReactNode;
  currentUser: UserProfile;
  activeTeam: Team | null;
  userTeams: Team[];
  onSelectTeam: (id: string) => void;
  currentView: 'home' | 'team' | 'profile';
  onNavigate: (view: 'home' | 'team' | 'profile') => void;
  onCreateTeam: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentUser, 
  activeTeam, 
  userTeams, 
  onSelectTeam, 
  currentView, 
  onNavigate,
  onCreateTeam
}) => {
  const [showTeamSwitcher, setShowTeamSwitcher] = useState(false);
  const [role, setRole] = useState<Role>('member');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!activeTeam) return;
    const unsubscribe = onSnapshot(doc(db, `teams/${activeTeam.id}/members/${currentUser.id}`), (doc) => {
      if (doc.exists()) {
        setRole(doc.data().role as Role);
      }
    });
    return () => unsubscribe();
  }, [activeTeam, currentUser.id]);

  const copyInvite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeTeam) return;
    const link = `${window.location.origin}/join/${activeTeam.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isAdmin = role === 'admin' || role === 'vice-admin';

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0 md:pt-16">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 glass-card z-40 h-16 md:h-20 px-4 md:px-8 flex items-center justify-between shadow-sm border-b-white/20">
        <div className="flex items-center gap-1 md:gap-4">
          <div className="hidden sm:flex w-10 h-10 bg-blue-600 rounded-xl items-center justify-center text-white font-black shadow-lg shadow-blue-200 shrink-0">TW</div>
          <div className="relative flex items-center gap-2">
            <button 
              onClick={() => setShowTeamSwitcher(!showTeamSwitcher)}
              className="flex items-center gap-2 hover:bg-white/50 px-3 py-2 rounded-xl transition-all max-w-[200px] md:max-w-none group"
            >
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-500 transition">Aktives Team</span>
                <span className="font-bold text-sm md:text-lg truncate text-slate-900">
                  {activeTeam?.name || 'Kein Team'}
                </span>
              </div>
              <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${showTeamSwitcher ? 'rotate-180 text-blue-600' : ''}`} />
            </button>

            {isAdmin && activeTeam && (
              <button 
                onClick={copyInvite}
                title="Einladungslink kopieren"
                className={`p-2.5 rounded-xl transition-all shadow-sm ${copied ? 'bg-green-100 text-green-600' : 'bg-white text-slate-400 hover:text-blue-600 hover:shadow-md'}`}
              >
                {copied ? <Check size={18} /> : <LinkIcon size={18} />}
              </button>
            )}

            {showTeamSwitcher && (
              <div className="absolute top-16 left-0 w-72 bg-white/90 backdrop-blur-2xl border border-white rounded-[2rem] shadow-2xl py-3 z-50 animate-in fade-in zoom-in-95 duration-200">
                <p className="px-5 py-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Meine Kabinen</p>
                <div className="max-h-[350px] overflow-y-auto px-2">
                  {userTeams.length > 0 ? userTeams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => {
                        onSelectTeam(team.id);
                        setShowTeamSwitcher(false);
                      }}
                      className={`w-full text-left px-4 py-4 mb-1 flex items-center gap-4 rounded-2xl transition-all ${activeTeam?.id === team.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 font-bold' : 'hover:bg-slate-50 font-medium text-slate-700'}`}
                    >
                      <img src={team.logoUrl} alt={team.name} className="w-10 h-10 rounded-xl border-2 border-white/50 object-cover shadow-sm" />
                      <span className="text-sm truncate">{team.name}</span>
                    </button>
                  )) : (
                    <p className="px-5 py-4 text-xs text-slate-400 italic">Noch keine Teams</p>
                  )}
                </div>
                <div className="border-t border-slate-100 mt-2 pt-3 px-3">
                  <button 
                    onClick={() => { onCreateTeam(); setShowTeamSwitcher(false); }}
                    className="w-full text-left px-4 py-4 text-sm text-blue-600 font-black hover:bg-blue-50 rounded-2xl transition flex items-center gap-3"
                  >
                    <div className="p-1.5 bg-blue-100 rounded-lg"><Plus size={16} /></div>
                    Team gründen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-6">
          <button className="relative p-2.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-xl transition shadow-sm">
            <Bell size={22} />
            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm"></span>
          </button>
          <button 
            onClick={() => onNavigate('profile')}
            className="flex items-center gap-3 p-1 pr-3 hover:bg-white rounded-2xl transition-all shadow-sm group"
          >
            <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-9 h-9 md:w-11 md:h-11 rounded-xl object-cover border-2 border-white shadow-md group-hover:scale-105 transition" />
            <span className="hidden md:block font-bold text-sm text-slate-700">{currentUser.name}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto max-w-6xl mx-auto w-full p-4 md:p-8 mt-16 md:mt-4">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/70 backdrop-blur-2xl border-t border-white/30 h-18 md:hidden flex items-center justify-around px-6 z-40 pb-2">
        <NavButton active={currentView === 'home'} onClick={() => onNavigate('home')} icon={<LayoutDashboard size={24} />} label="Home" />
        <NavButton active={currentView === 'team'} onClick={() => onNavigate('team')} icon={<Users size={24} />} label="Team" />
        <NavButton active={currentView === 'profile'} onClick={() => onNavigate('profile')} icon={<User size={24} />} label="Profil" />
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: any, label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${active ? 'text-blue-600 bg-blue-50/50 scale-110' : 'text-slate-400'}`}
  >
    {icon}
    <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
  </button>
);
