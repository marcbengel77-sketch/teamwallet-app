
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TeamProvider } from './contexts/TeamContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import TeamSettingsPage from './pages/TeamSettingsPage';
import FinesCatalogPage from './pages/FinesCatalogPage';
import InvitePage from './pages/InvitePage';
import ExpensesPage from './pages/ExpensesPage'; // Import the new ExpensesPage
import Header from './components/Header';
import MobileNav from './components/MobileNav';
// Import auth and firestore directly from services/firebase
import { auth, firestore } from './services/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';


const MainAppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // auth and firestore are now imported directly, not re-initialized
  // const auth = getAuth(firebaseApp); 
  // const firestore = getFirestore(firebaseApp); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // If user is logged out and not on auth or invite page, redirect to auth.
      if (!user && location.pathname !== '/auth' && !location.pathname.startsWith('/invite')) {
        navigate('/auth');
      }
    });
    return () => unsubscribe();
  }, [auth, navigate, location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow p-4 md:p-6 pb-20 md:pb-6 max-w-7xl mx-auto w-full">
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/invite/:inviteId" element={<InvitePage />} />
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/team-settings" element={<ProtectedRoute><TeamSettingsPage /></ProtectedRoute>} />
          <Route path="/fines-catalog" element={<ProtectedRoute><FinesCatalogPage /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} /> {/* New Expenses Page Route */}
          <Route path="*" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} /> {/* Fallback for unknown routes */}
        </Routes>
      </main>
      <MobileNav />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <TeamProvider>
          <MainAppContent />
        </TeamProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;