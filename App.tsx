
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
import { doc, getDoc, collectionGroup, query, where, onSnapshot, setDoc, addDoc, collection } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { X, Loader2, Trophy, ShieldCheck } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'home' | 'team' | 'profile'>('home');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingJoin, setIsProcessingJoin] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const addToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sicherheits-Timeout für Ladezustand (Max 6 Sek)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        console.warn("Auth timeout reached. Forcing load completion.");
        setIsLoading(false);
      }
    }, 6000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef).catch(() => null);
          
          if (userDoc && userDoc.exists()) {
            setCurrentUser({ id: firebaseUser.uid, ...userDoc.data() } as UserProfile);
          } else {
            setCurrentUser({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Spieler',
              email: firebaseUser.email || '',
              avatarUrl: `https://picsum.photos/seed/${firebaseUser.uid}/200`
            });
          }
          setCurrentView('home');
        } else {
          setCurrentUser(null);
          setUserTeams([]);
          setActiveTeamId(null);
        }
      } catch (err) {
        console.error("Auth process error:", err);
      } finally {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Teams Listener mit Fehlerbehandlung für fehlende Indizes
  useEffect(() => {
    if (!currentUser) return;

    let unsub: (() => void) | undefined;

    try {
      const q = query(collectionGroup(db, 'members'), where('userId', '==', currentUser.id));
      unsub = onSnapshot(q, async (snapshot) => {
        const teamsData: Team[] = [];
        for (const memberDoc of snapshot.docs) {
          try {
            const teamId = memberDoc.ref.parent.parent?.id;
            if (teamId) {
              const teamDoc = await getDoc(doc(db, 'teams', teamId));
              if (teamDoc.exists()) {
                teamsData.push({ id: teamId, ...teamDoc.data() } as Team);
              }
            }
          } catch (e) {
            console.error("Error fetching single team:", e);
          }
        }
        setUserTeams(teamsData);
        if (teamsData.length > 0 && !activeTeamId) {
          setActiveTeamId(teamsData[0].id);
        }
      }, (err) => {
        console.error("Teams onSnapshot error (Check Firestore Indices):", err);
        addToast("Fehler beim Laden der Teams. Bitte Konsole prüfen.", "error");
      });
    } catch (err) {
      console.error("Query creation failed:", err);
    }

    return () => unsub && unsub();
  }, [currentUser, activeTeamId]);

  const handleCreateTeam = async (name: string, logoUrl: string) => {
    if (!currentUser) return;
    try {
      const teamRef = await addDoc(collection(db, 'teams'), {
        name,
        logoUrl: logoUrl || `https://picsum.photos/seed/${Math.random()}/200`,
        createdAt: new Date().toISOString()
      });
      
      await setDoc(doc(db, `teams/${teamRef.id}/members/${currentUser.id}`), {
        userId: currentUser.id,
        role: 'admin',
        joinedAt: new Date().toISOString()
      });

      const defaultCats = [
        { name: 'Zu spät zum Training', amount: 2.50, description: 'Pro 5 Min' },
        { name: 'Handy in der Kabine', amount: 5.00, description: 'Klingeln oder Benutzen' },
        { name: 'Gelbe Karte (Meckern)', amount: 10.00, description: 'Unsportlich' }
      ];
      
      for (const cat of defaultCats) {
        await addDoc(collection(db, `teams/${teamRef.id}/catalog`), cat);
      }

      setActiveTeamId(teamRef.id);
      setShowCreateModal(false);
      setCurrentView('home');
      addToast(`Team "${name}" wurde gegründet!`, "success");
    } catch (e) {
      console.error("Team create error:", e);
      addToast("Fehler bei Teamgründung.", "error");
    }
  };

  const activeTeam = useMemo(() => 
    userTeams.find(t => t.id === activeTeamId) || null
  , [activeTeamId, userTeams]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50">
        <div className="relative">
          <div className="h-20 w-20 animate-spin rounded-3xl border-4 border-blue-600 border-t-transparent shadow-2xl"></div>
          <div className="absolute inset-0 flex items-center justify-center text-blue-600 font-black">TW</div>
        </div>
        <p className="mt-8 text-slate-400 font-black uppercase tracking-[0.3em] text-xs animate-pulse">Kabine wird vorbereitet...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthView onLogin={() => setCurrentView('home')} addToast={addToast} />;
  }

  return (
    <Layout 
      currentUser={currentUser}
      activeTeam={activeTeam}
      userTeams={userTeams}
      onSelectTeam={setActiveTeamId}
      currentView={currentView}
      onNavigate={setCurrentView}
      onCreateTeam={() => setShowCreateModal(true)}
    >
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
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
            <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center text-blue-600 mb-8 shadow-2xl animate-bounce">
              <Trophy size={48} />
            </div>
            <h2 className="text-3xl font-black mb-4 tracking-tight">Moin, {currentUser.name}!</h2>
            <p className="text-slate-500 mb-10 max-w-sm mx-auto font-medium text-lg leading-relaxed">Du bist noch in keinem Team. Gründe eine eigene Kabine oder lass dich einladen.</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-blue-700 transition shadow-2xl shadow-blue-200 active:scale-95"
            >
              Neue Kabine gründen
            </button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateTeamModal 
          onClose={() => setShowCreateModal(false)} 
          onSubmit={handleCreateTeam} 
        />
      )}

      <ToastContainer messages={toasts} onRemove={removeToast} />
    </Layout>
  );
};

const CreateTeamModal: React.FC<{ onClose: () => void, onSubmit: (name: string, logo: string) => Promise<void> }> = ({ onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || loading) return;
    setLoading(true);
    try {
      await onSubmit(name, logo);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
          <h3 className="text-xl font-black tracking-tight">Team gründen</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2 group">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Wie heißt dein Team?</label>
            <input 
              type="text" 
              required 
              autoFocus
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="z.B. FC Bolzplatz 04" 
              className="w-full p-4 rounded-2xl bg-slate-100 border-none text-lg font-bold focus:ring-4 focus:ring-blue-500/10 transition" 
            />
          </div>
          <div className="space-y-2 group">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Vereinslogo (Optional)</label>
            <input 
              type="url" 
              value={logo} 
              onChange={(e) => setLogo(e.target.value)} 
              placeholder="https://..." 
              className="w-full p-4 rounded-2xl bg-slate-100 border-none text-sm focus:ring-4 focus:ring-blue-500/10 transition" 
            />
          </div>
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
             <ShieldCheck size={20} className="text-blue-600 mt-1" />
             <p className="text-xs text-blue-700 font-medium leading-relaxed">Du wirst automatisch Administrator und erhältst Zugriff auf alle Kassenfunktionen.</p>
          </div>
          <button 
            type="submit" 
            disabled={loading || !name} 
            className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-700 transition shadow-2xl shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Kabine eröffnen'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default App;
