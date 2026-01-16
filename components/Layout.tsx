
import React, { useState, useEffect } from 'react';
import { UserProfile, Team, Role } from '../types';
import { LayoutDashboard, Users, User, ChevronDown, Bell, Link as LinkIcon, Check } from 'lucide-react';
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
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentUser, 
  activeTeam, 
  userTeams, 
  onSelectTeam, 
  currentView, 
  onNavigate 
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
      <header className="fixed top-0 left-0 right-0 bg-white border-b z-40 h-16 px-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-1 md:gap-3">
          <div className="hidden sm:flex w-8 h-8 bg-blue-600 rounded-lg items-center justify-center text-white font-bold shrink-0">TW</div>
          <div className="relative flex items-center gap-1">
            <button 
              onClick={() => setShowTeamSwitcher(!showTeamSwitcher)}
              className="flex items-center gap-1 hover:bg-slate-50 px-2 py-1 rounded transition max-w-[180px] md:max-w-none"
            >
              <span className="font-bold text-sm md:text-base truncate">
                {activeTeam?.name || 'Kein Team'}
              </span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${showTeamSwitcher ? 'rotate-180' : ''}`} />
            </button>

            {isAdmin && activeTeam && (
              <button 
                onClick={copyInvite}
                title="Einladungslink kopieren"
                className={`p-1.5 rounded-lg transition-all ${copied ? 'bg-green-100 text-green-600' : 'text-slate-400 hover:bg-blue-50 hover:text-blue-600'}`}
              >
                {copied ? <Check size={16} /> : <LinkIcon size={16} />}
              </button>
            )}

            {showTeamSwitcher && (
              <div className="absolute top-10 left-0 w-64 bg-white border rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Meine Teams</p>
                <div className="max-h-[300px] overflow-y-auto">
                  {userTeams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => {
                        onSelectTeam(team.id);
                        setShowTeamSwitcher(false);
                      }}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition ${activeTeam?.id === team.id ? 'bg-blue-50 text-blue-700 font-bold' : 'font-medium'}`}
                    >
                      <img src={team.logoUrl} alt={team.name} className="w-8 h-8 rounded-full border border-slate-200 object-cover" />
                      <span className="text-sm truncate">{team.name}</span>
                    </button>
                  ))}
                </div>
                <div className="border-t mt-2 pt-2 px-2">
                  <button 
                    onClick={() => { onNavigate('team'); setShowTeamSwitcher(false); }}
                    className="w-full text-left px-3 py-3 text-sm text-blue-600 font-bold hover:bg-blue-50 rounded-xl transition"
                  >
                    + Neues Team gründen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button className="relative p-2 text-slate-500 hover:text-blue-600 transition">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <button 
            onClick={() => onNavigate('profile')}
            className="flex items-center gap-2 ring-2 ring-transparent hover:ring-blue-100 rounded-full transition-all"
          >
            <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover border border-slate-200" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto max-w-5xl mx-auto w-full p-4 md:p-6 mt-16 md:mt-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t h-16 md:hidden flex items-center justify-around px-4 z-40">
        <NavButton active={currentView === 'home'} onClick={() => onNavigate('home')} icon={<LayoutDashboard size={22} />} label="Home" />
        <NavButton active={currentView === 'team'} onClick={() => onNavigate('team')} icon={<Users size={22} />} label="Team" />
        <NavButton active={currentView === 'profile'} onClick={() => onNavigate('profile')} icon={<User size={22} />} label="Profil" />
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: any, label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 p-2 transition-all ${active ? 'text-blue-600 scale-110' : 'text-slate-400'}`}
  >
    {icon}
    <span className={`text-[9px] font-bold uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
  </button>
);
