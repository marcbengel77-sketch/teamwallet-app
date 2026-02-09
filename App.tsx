
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import PenaltyCatalog from './pages/PenaltyCatalog';
import Admin from './pages/Admin';
import InitialSetup from './pages/InitialSetup';
import JoinTeam from './pages/JoinTeam';
import { AuthProvider } from './contexts/AuthContext';
import { TeamProvider } from './contexts/TeamContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <TeamProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/join" element={<JoinTeam />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/members"
                  element={
                    <ProtectedRoute>
                      <Members />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/penalties"
                  element={
                    <ProtectedRoute>
                      <PenaltyCatalog />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/setup"
                  element={
                    <ProtectedRoute>
                      <InitialSetup />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </main>
          </div>
        </TeamProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
