
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
    navigate('/dashboard'); // Navigate to dashboard after team change
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Abmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.');
    }
  };

  if (sessionLoading) {
    return (
      <nav className="bg-indigo-700 p-4 text-white shadow-md flex justify-between items-center fixed w-full top-0 z-10">
        <LoadingSpinner />
      </nav>
    );
  }

  if (!user) {
    return null; // Don't render navbar if not logged in
  }

  return (
    <nav className="bg-indigo-700 p-4 text-white shadow-md flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0 fixed w-full top-0 z-10">
      <div className="flex items-center space-x-4 w-full md:w-auto justify-between md:justify-start">
        <h1 className="text-2xl font-bold">Teamkasse ⚽</h1>
        {userTeams.length > 0 && (
          <select
            className="bg-indigo-800 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300 ml-4"
            value={selectedTeam?.id || ''}
            onChange={handleTeamChange}
            disabled={loadingTeams}
          >
            {loadingTeams ? (
              <option>Lädt Teams...</option>
            ) : (
              userTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.season})
                </option>
              ))
            )}
          </select>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 w-full md:w-auto">
        <div className="flex space-x-4 mt-2 md:mt-0">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `hover:text-indigo-200 ${isActive ? 'font-bold text-indigo-100' : ''}`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/members"
            className={({ isActive }) =>
              `hover:text-indigo-200 ${isActive ? 'font-bold text-indigo-100' : ''}`
            }
          >
            Mitglieder
          </NavLink>
          <NavLink
            to="/penalties"
            className={({ isActive }) =>
              `hover:text-indigo-200 ${isActive ? 'font-bold text-indigo-100' : ''}`
            }
          >
            Strafen
          </NavLink>
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `hover:text-indigo-200 ${isActive ? 'font-bold text-indigo-100' : ''}`
            }
          >
            Admin
          </NavLink>
        </div>

        <div className="flex items-center space-x-4 mt-2 md:mt-0">
          <span className="text-sm">
            {profile?.full_name || profile?.email || 'Gast'}
          </span>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md text-sm"
          >
            Abmelden
          </button>
        </div>
      </div>
    </nav>
  );
};
