
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTeam } from '../contexts/TeamContext';
import Button from './ui/Button';
import { Link } from 'react-router-dom';

const TeamSwitcher: React.FC = () => {
  const { userTeams, selectedTeam, selectTeam, loading, refetchTeams } = useTeam();
  const [isOpen, setIsOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  const handleSelectTeam = useCallback((teamId: string) => {
    selectTeam(teamId);
    setIsOpen(false);
  }, [selectTeam]);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClickOutside]);

  const toggleDropdown = useCallback(() => setIsOpen(!isOpen), [isOpen]);

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="h-8 w-32 animate-pulse rounded-md bg-gray-200" />
        <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
      </div>
    );
  }

  if (userTeams.length === 0) {
    return (
      <Link to="/team-settings">
        <Button variant="outline" className="text-gray-700">
          Team erstellen
        </Button>
      </Link>
    );
  }

  return (
    <div ref={switcherRef} className="relative z-50">
      <Button
        variant="outline"
        className="flex items-center gap-2 text-gray-700"
        onClick={toggleDropdown}
      >
        <span className="truncate max-w-[120px] sm:max-w-none">
          {selectedTeam ? selectedTeam.name : 'Team auswählen'}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`ml-auto h-4 w-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6"></path>
        </svg>
      </Button>
      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 rounded-md border bg-white shadow-lg">
          <div className="p-1">
            {userTeams.map((team) => (
              <div
                key={team.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm ${
                  selectedTeam?.id === team.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'
                }`}
                onClick={() => handleSelectTeam(team.id)}
              >
                {team.logoUrl ? (
                  <img src={team.logoUrl} alt={team.name} className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                    {team.name.charAt(0)}
                  </div>
                )}
                {team.name}
              </div>
            ))}
          </div>
          <div className="border-t p-1">
            <Link to="/team-settings" onClick={() => setIsOpen(false)} className="block w-full text-left px-2 py-1.5 text-sm text-blue-600 hover:bg-gray-100 rounded-md">
              Team erstellen / beitreten
            </Link>
            <Button variant="ghost" onClick={refetchTeams} className="w-full justify-start text-sm text-gray-700">
              Teams aktualisieren
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamSwitcher;
