
import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TeamView } from './components/TeamView';
import { ProfileView } from './components/ProfileView';
import { AuthView } from './components/AuthView';
import { ToastContainer, ToastMessage } from './components/Toast';
import { UserProfile, Team } from './types';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collectionGroup, query, where, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'home' | 'team' | 'profile'>('home');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingJoin, setIsProcessingJoin] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setCurrentUser({ id: firebaseUser.uid, ...userDoc.data() } as UserProfile);
          } else {
            const newUser = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Neuer Nutzer',
              email: firebaseUser.email || '',
              avatarUrl: `https://picsum.photos/seed/${firebaseUser.uid}/200`
            };
            setCurrentUser(newUser);
          }
        } catch (e) {
          console.error("Firebase connection error. Check your API Keys.", e);
        }
      } else {
        setCurrentUser(null);
        setUserTeams([]);
        setActiveTeamId(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Teams Listener
  useEffect(() => {
    if (!currentUser) return;

    const q = query(collectionGroup(db, 'members'), where('userId', '==', currentUser.id));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const teamsData: Team[] = [];
      for (const memberDoc of snapshot.docs) {
        const teamId = memberDoc.ref.parent.parent?.id;
        if (teamId) {
          const teamDoc = await getDoc(doc(db, 'teams', teamId));
          if (teamDoc.exists()) {
            teamsData.push({ id: teamId, ...teamDoc.data() } as Team);
          }
        }
      }
      setUserTeams(teamsData);
      if (teamsData.length > 0 && !activeTeamId) {
        setActiveTeamId(teamsData[0].id);
      }
    }, (error) => {
      console.error("Snapshot error:", error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Handle Join Link
  useEffect(() => {
    const processJoinLink = async () => {
      const path = window.location.pathname;
      if (path.startsWith('/join/') && currentUser && !isProcessingJoin) {
        const teamId = path.split('/join/')[1];
        if (teamId) {
          setIsProcessingJoin(true);
          try {
            const teamDoc = await getDoc(doc(db, 'teams', teamId));
            if (teamDoc.exists()) {
              await setDoc(doc(db, `teams/${teamId}/members`, currentUser.id), {
                userId: currentUser.id,
                role: 'member',
                joinedAt: new Date().toISOString()
              });
              addToast(`Erfolgreich beigetreten: ${teamDoc.data().name}`, "success");
              setActiveTeamId(teamId);
              setCurrentView('home');
            } else {
              addToast("Team nicht gefunden.", "error");
            }
          } catch (e) {
            console.error("Join error:", e);
            addToast("Fehler beim Beitreten. Prüfe Berechtigungen.", "error");
          } finally {
            setIsProcessingJoin(false);
            window.history.replaceState({}, '', '/'); 
          }
        }
      }
    };

    processJoinLink();
  }, [currentUser, isProcessingJoin]);

  const activeTeam = useMemo(() => 
    userTeams.find(t => t.id === activeTeamId) || null
  , [activeTeamId, userTeams]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-slate-500 font-medium tracking-wide italic">Warten auf Spielfreigabe...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthView onLogin={() => {}} addToast={addToast} />;
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
            <Dashboard activeTeamId={activeTeamId} currentUser={currentUser} addToast={addToast} />
          ) : currentView === 'team' ? (
            <TeamView activeTeamId={activeTeamId} currentUser={currentUser} addToast={addToast} />
          ) : (
            <ProfileView currentUser={currentUser} onUpdateUser={setCurrentUser} onLogout={() => auth.signOut()} />
          )
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-6 shadow-inner">
              <span className="text-3xl font-bold">+</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">Moin, {currentUser.name}!</h2>
            <p className="text-slate-600 mb-8 max-w-xs mx-auto font-medium">Du bist noch keinem Team beigetreten.</p>
            <button 
              onClick={() => setCurrentView('team')}
              className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-700 transition shadow-xl shadow-blue-200 active:scale-95"
            >
              Neues Team gründen
            </button>
          </div>
        )}
      </div>
      <ToastContainer messages={toasts} onRemove={removeToast} />
    </Layout>
  );
};

export default App;
