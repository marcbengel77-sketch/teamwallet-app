
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTeam } from '../contexts/TeamContext';
import { UserRole } from '../types'; // Import UserRole

const MobileNav: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const { unreadNotifications, loading: teamLoading, selectedTeamMembership } = useTeam(); // Get selectedTeamMembership
  const location = useLocation();

  if (authLoading || teamLoading || !currentUser) {
    return null; // Don't show mobile nav if not authenticated or loading
  }

  const isAdminOrViceAdmin = selectedTeamMembership?.role === UserRole.ADMIN || selectedTeamMembership?.role === UserRole.VICE_ADMIN;

  const navItems = [
    { name: 'Home', path: '/', icon: (active: boolean) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`h-6 w-6 ${active ? 'text-blue-600' : 'text-gray-500'}`}
      >
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    ), hasNotification: unreadNotifications },
    // Conditionally add Fines Catalog
    ...(isAdminOrViceAdmin ? [{
      name: 'Strafen',
      path: '/fines-catalog',
      icon: (active: boolean) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-6 w-6 ${active ? 'text-blue-600' : 'text-gray-500'}`}
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <line x1="10" y1="9" x2="8" y2="9"></line>
        </svg>
      )
    }] : []),
    // Conditionally add Expenses
    ...(isAdminOrViceAdmin ? [{
      name: 'Ausgaben',
      path: '/expenses',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-6 w-6 ${active ? 'text-blue-600' : 'text-gray-500'}`}>
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      )
    }] : []),
    { name: 'Team', path: '/team-settings', icon: (active: boolean) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`h-6 w-6 ${active ? 'text-blue-600' : 'text-gray-500'}`}
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    )},
    { name: 'Profile', path: '/profile', icon: (active: boolean) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`h-6 w-6 ${active ? 'text-blue-600' : 'text-gray-500'}`}
      >
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    )},
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 bg-white border-t p-2 md:hidden">
      <div className="flex justify-around items-center h-full">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center p-2 rounded-md relative ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              {item.icon(isActive)}
              <span className={`text-xs mt-1 ${isActive ? 'font-semibold text-blue-600' : 'font-medium'}`}>
                {item.name}
              </span>
              {item.hasNotification && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;