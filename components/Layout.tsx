
import React, { useState } from 'react';
import { UserProfile, Team } from '../types';
import { LayoutDashboard, Users, User, ChevronDown, Bell, LogOut } from 'lucide-react';

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

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0 md:pt-16">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b z-40 h-16 px-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">TW</div>
          <div className="relative">
            <button 
              onClick={() => setShowTeamSwitcher(!showTeamSwitcher)}
              className="flex items-center gap-2 hover:bg-slate-50 px-2 py-1 rounded transition"
            >
              <span className="font-semibold text-sm md:text-base truncate max-w-[120px] md:max-w-none">
                {activeTeam?.name || 'Kein Team'}
              </span>
              <ChevronDown size={16} className={`transition-transform ${showTeamSwitcher ? 'rotate-180' : ''}`} />
            </button>

            {showTeamSwitcher && (
              <div className="absolute top-10 left-0 w-56 bg-white border rounded-lg shadow-xl py-2 z-50">
                <p className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Meine Teams</p>
                {userTeams.map(team => (
                  <button
                    key={team.id}
                    onClick={() => {
                      onSelectTeam(team.id);
                      setShowTeamSwitcher(false);
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition ${activeTeam?.id === team.id ? 'bg-blue-50 text-blue-700' : ''}`}
                  >
                    <img src={team.logoUrl} alt={team.name} className="w-8 h-8 rounded-full border border-slate-200 object-cover" />
                    <span className="font-medium text-sm">{team.name}</span>
                  </button>
                ))}
                <div className="border-t mt-2 pt-2">
                  <button 
                    onClick={() => { onNavigate('team'); setShowTeamSwitcher(false); }}
                    className="w-full text-left px-4 py-3 text-sm text-blue-600 font-medium hover:bg-slate-50 transition"
                  >
                    + Neues Team gründen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative p-2 text-slate-500 hover:text-blue-600 transition">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <button 
            onClick={() => onNavigate('profile')}
            className="hidden md:flex items-center gap-2"
          >
            <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto max-w-5xl mx-auto w-full p-4 md:p-6 mt-16 md:mt-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t h-16 md:hidden flex items-center justify-around px-4 z-40">
        <button 
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center gap-1 p-2 ${currentView === 'home' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <LayoutDashboard size={20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Home</span>
        </button>
        <button 
          onClick={() => onNavigate('team')}
          className={`flex flex-col items-center gap-1 p-2 ${currentView === 'team' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <Users size={20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Team</span>
        </button>
        <button 
          onClick={() => onNavigate('profile')}
          className={`flex flex-col items-center gap-1 p-2 ${currentView === 'profile' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <User size={20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Profil</span>
        </button>
      </nav>
    </div>
  );
};
