
import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TeamView } from './components/TeamView';
import { ProfileView } from './components/ProfileView';
import { AuthView } from './components/AuthView';
import { ToastContainer, ToastMessage } from './components/Toast';
import { UserProfile, Team, TeamMember, PenaltyCategory, PenaltyRecord, Transaction } from './types';
import { mockUsers, mockTeams, mockMembers, mockPenaltyCategories, mockPenaltyRecords, mockTransactions } from './lib/mockData';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'home' | 'team' | 'profile'>('home');
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentUser(mockUsers[0]);
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const userTeams = useMemo(() => {
    if (!currentUser) return [];
    const memberOf = mockMembers.filter(m => m.userId === currentUser.id).map(m => m.teamId);
    return mockTeams.filter(t => memberOf.includes(t.id));
  }, [currentUser]);

  useEffect(() => {
    if (userTeams.length > 0 && !activeTeamId) {
      setActiveTeamId(userTeams[0].id);
    }
  }, [userTeams, activeTeamId]);

  const activeTeam = useMemo(() => 
    mockTeams.find(t => t.id === activeTeamId) || null
  , [activeTeamId]);

  const activeUserRole = useMemo(() => {
    if (!currentUser || !activeTeamId) return 'member';
    const member = mockMembers.find(m => m.userId === currentUser.id && m.teamId === activeTeamId);
    return member?.role || 'member';
  }, [currentUser, activeTeamId]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-slate-500 font-medium">Lade TeamWallet...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthView onLogin={(user) => setCurrentUser(user)} />;
  }

  return (
    <Layout 
      currentUser={currentUser}
      activeTeam={activeTeam}
      userTeams={userTeams}
      onSelectTeam={setActiveTeamId}
      currentView={currentView}
      onNavigate={setCurrentView}
    >
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {activeTeamId ? (
          currentView === 'home' ? (
            <Dashboard activeTeamId={activeTeamId} currentUser={currentUser} role={activeUserRole} addToast={addToast} />
          ) : currentView === 'team' ? (
            <TeamView activeTeamId={activeTeamId} currentUser={currentUser} role={activeUserRole} addToast={addToast} />
          ) : (
            <ProfileView currentUser={currentUser} onUpdateUser={setCurrentUser} onLogout={() => setCurrentUser(null)} addToast={addToast} />
          )
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Willkommen bei TeamWallet!</h2>
            <p className="text-slate-600 mb-6">Du bist noch keinem Team beigetreten.</p>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg">Team gründen</button>
          </div>
        )}
      </div>
      <ToastContainer messages={toasts} onRemove={removeToast} />
    </Layout>
  );
};

export default App;
