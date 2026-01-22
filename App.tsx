
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import PenaltyCatalog from './pages/PenaltyCatalog';
import Admin from './pages/Admin';
import InitialSetup from './pages/InitialSetup';
import { AuthProvider } from './contexts/AuthContext';
import { TeamProvider } from './contexts/TeamContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';

function App() {
  // DIES IST EINE TEMPORÄRE ÄNDERUNG ZUR FEHLERBEHEBUNG EINER WEISSEN SEITE.
  // BITTE MACHEN SIE DIESE ÄNDERUNG RÜCKGÄNGIG, SOBALD DIE AUTH-SEITE SICHTBAR IST.
  return (
    <HashRouter>
      <AuthProvider>
        <TeamProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow p-4">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/auth" element={<Auth />} />
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

  // Temporäre Debugging-Ansicht: Nur die Auth-Komponente rendern
  // return (
  //   <div className="flex flex-col min-h-screen">
  //     <Auth />
  //   </div>
  // );
}

export default App;