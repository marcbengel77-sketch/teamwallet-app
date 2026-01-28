
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import { LoadingSpinner } from './LoadingSpinner';

export const Navbar: React.FC = () => {
  const { user, profile, signOut, sessionLoading } = useAuth();
  const { selectedTeam, userTeams, selectTeam, loadingTeams } = useTeam();
  const navigate = useNavigate();

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
      <nav className="bg-indigo-700 p-4 text-white shadow-md flex justify-between items-center fixed w-full top-0 z-50 h-16">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        </div>
      </nav>
    );
  }

  if (!user) return null;

  return (
    <nav className="bg-indigo-700 p-4 text-white shadow-md flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0 fixed w-full top-0 z-50">
      <div className="flex items-center space-x-4 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold tracking-tight">TeamWallet</h1>
        </div>
        
        {(userTeams.length > 0 || loadingTeams) && (
          <div className="relative flex items-center ml-4">
            <select
              className="bg-indigo-800 text-white p-2 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 appearance-none cursor-pointer min-w-[140px]"
              value={selectedTeam?.id || ''}
              onChange={handleTeamChange}
            >
              {userTeams.length === 0 ? (
                <option value="">Lade Teams...</option>
              ) : (
                userTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))
              )}
            </select>
            <div className="absolute right-2 pointer-events-none">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 w-full md:w-auto">
        <div className="flex space-x-4">
          <NavLink to="/dashboard" className={({ isActive }) => `text-sm font-medium ${isActive ? 'text-white border-b-2' : 'text-indigo-100'}`}>Dashboard</NavLink>
          <NavLink to="/members" className={({ isActive }) => `text-sm font-medium ${isActive ? 'text-white border-b-2' : 'text-indigo-100'}`}>Mitglieder</NavLink>
          <NavLink to="/penalties" className={({ isActive }) => `text-sm font-medium ${isActive ? 'text-white border-b-2' : 'text-indigo-100'}`}>Katalog</NavLink>
          <NavLink to="/admin" className={({ isActive }) => `text-sm font-medium ${isActive ? 'text-white border-b-2' : 'text-indigo-100'}`}>Admin</NavLink>
        </div>
        <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white py-1.5 px-3 rounded-lg text-xs transition active:scale-95">Logout</button>
      </div>
    </nav>
  );
};
