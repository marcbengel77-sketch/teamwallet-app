
import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import { NotificationCenter } from './NotificationCenter';

export const Navbar: React.FC = () => {
  const { user, signOut, sessionLoading } = useAuth();
  const { selectedTeam, userTeams, selectTeam, loadingTeams, isViceAdmin } = useTeam();
  const navigate = useNavigate();
  const location = useLocation();

  const isJoinPage = location.pathname.startsWith('/join');

  const handleTeamChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    selectTeam(event.target.value);
    navigate('/dashboard'); 
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (sessionLoading) {
    return (
      <nav className="bg-indigo-700 p-4 text-white shadow-md fixed w-full top-0 z-50 h-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
      </nav>
    );
  }

  if (!user) return null;

  return (
    <nav className="bg-indigo-700 text-white shadow-lg fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top Bar: Brand & Team Selector */}
        <div className="flex items-center justify-between h-16 gap-3">
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
            <h1 
              className="text-lg sm:text-2xl font-black tracking-tight cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis" 
              onClick={() => navigate('/dashboard')}
            >
              TW
              <span className="hidden xs:inline"> Wallet</span>
            </h1>
            
            {!isJoinPage && (userTeams.length > 0 || loadingTeams) && (
              <div className="relative flex items-center min-w-0">
                <select
                  className="bg-indigo-800 text-white text-[11px] sm:text-sm p-2 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 appearance-none cursor-pointer w-full max-w-[120px] sm:max-w-[200px] truncate"
                  value={selectedTeam?.id || ''}
                  onChange={handleTeamChange}
                >
                  {userTeams.length === 0 ? (
                    <option value="">Lädt...</option>
                  ) : (
                    userTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))
                  )}
                </select>
                <div className="absolute right-2 pointer-events-none">
                  <svg className="h-3 w-3 sm:h-4 sm:w-4 fill-current opacity-70" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                  </svg>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1 sm:space-x-4">
            <NotificationCenter />
            <button 
              onClick={handleLogout} 
              className="bg-indigo-800 hover:bg-red-500 text-white py-1.5 px-2 sm:px-3 rounded-lg text-[10px] sm:text-xs font-bold transition-all active:scale-95 border border-indigo-500"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Bottom Bar: Navigation Links */}
        {userTeams.length > 0 && (
          <div className="flex overflow-x-auto no-scrollbar py-2 sm:py-0 sm:h-12 items-center space-x-4 sm:space-x-8 scroll-smooth border-t border-indigo-600/30 sm:border-t-0">
            <NavLink to="/dashboard" className={({ isActive }) => `text-[11px] sm:text-sm font-bold whitespace-nowrap pb-1 border-b-2 transition-all ${isActive ? 'text-white border-white' : 'text-indigo-200 border-transparent hover:text-white'}`}>Dashboard</NavLink>
            <NavLink to="/members" className={({ isActive }) => `text-[11px] sm:text-sm font-bold whitespace-nowrap pb-1 border-b-2 transition-all ${isActive ? 'text-white border-white' : 'text-indigo-200 border-transparent hover:text-white'}`}>Team</NavLink>
            <NavLink to="/penalties" className={({ isActive }) => `text-[11px] sm:text-sm font-bold whitespace-nowrap pb-1 border-b-2 transition-all ${isActive ? 'text-white border-white' : 'text-indigo-200 border-transparent hover:text-white'}`}>Katalog</NavLink>
            {isViceAdmin && (
              <NavLink to="/admin" className={({ isActive }) => `text-[11px] sm:text-sm font-bold whitespace-nowrap pb-1 border-b-2 transition-all ${isActive ? 'text-white border-white' : 'text-indigo-200 border-transparent hover:text-white'}`}>Admin</NavLink>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
