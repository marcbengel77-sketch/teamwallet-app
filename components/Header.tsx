
import React from 'react';
import { Link } from 'react-router-dom';
import TeamSwitcher from './TeamSwitcher';
import Avatar from './ui/Avatar';
import { useAuth } from '../contexts/AuthContext';
import { APP_NAME } from '../constants';

const Header: React.FC = () => {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading || !currentUser) {
    return null; // Don't show header if not authenticated or loading
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white shadow-sm">
      <div className="container mx-auto h-16 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-xl font-bold text-gray-900 hidden md:block">
            {APP_NAME}
          </Link>
          <TeamSwitcher />
        </div>
        <nav className="flex items-center space-x-4">
          <Link to="/profile" className="flex items-center space-x-2">
            <Avatar
              src={userProfile?.avatarUrl}
              alt={userProfile?.displayName || currentUser?.email || 'User'}
              fallbackText={userProfile?.displayName?.charAt(0) || currentUser?.email?.charAt(0)}
              size="md"
            />
            <span className="hidden md:block font-medium text-gray-700">
              {userProfile?.displayName || currentUser?.email}
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
