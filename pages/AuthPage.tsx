
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  registerUser,
  loginUser,
  resetPassword
} from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
// Removed Card imports as per the change
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { APP_NAME } from '../constants';

type AuthMode = 'login' | 'register' | 'forgot-password';

const AuthPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && currentUser) {
      navigate('/');
    }
  }, [currentUser, authLoading, navigate]);

  const handleAuthSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          setError('Passwörter stimmen nicht überein.');
          return;
        }
        await registerUser(email, password, displayName);
        setSuccessMessage('Registrierung erfolgreich! Bitte überprüfen Sie Ihre E-Mails zur Verifizierung.');
        setMode('login');
      } else if (mode === 'login') {
        await loginUser(email, password);
        // User will be redirected by AuthProvider useEffect
      } else if (mode === 'forgot-password') {
        await resetPassword(email);
        setSuccessMessage('Passwort-Reset-Link wurde an Ihre E-Mail gesendet.');
        setMode('login');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Diese E-Mail-Adresse ist bereits registriert.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Ungültige E-Mail-Adresse.');
      } else if (err.code === 'auth/weak-password') {
        setError('Das Passwort sollte mindestens 6 Zeichen lang sein.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Ungültige E-Mail oder falsches Passwort.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Zu viele fehlgeschlagene Anmeldeversuche. Bitte versuchen Sie es später erneut.');
      } else {
        setError('Ein unerwarteter Fehler ist aufgetreten: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, password, displayName, confirmPassword, mode]);

  const cardTitleText = {
    login: 'Login',
    register: 'Registrieren',
    'forgot-password': 'Passwort vergessen',
  };

  const cardDescriptionText = {
    login: 'Melden Sie sich an, um TeamWallet zu nutzen.',
    register: 'Erstellen Sie ein neues Konto.',
    'forgot-password': 'Geben Sie Ihre E-Mail-Adresse ein, um Ihr Passwort zurückzusetzen.',
  };

  if (authLoading || currentUser) {
    return null; // Don't show auth page content if still loading or already logged in
  }

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-64px)] p-4">
      {/* Replaced Card with a div for simpler structure */}
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <div className="mb-4 text-center">
          <h2 className="text-2xl font-semibold leading-none tracking-tight">{cardTitleText[mode]}</h2>
          <p className="text-sm text-gray-500 mt-1">{cardDescriptionText[mode]}</p>
        </div>
        <div> {/* Replaced CardContent with a div */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {successMessage && <p className="text-green-600 text-sm">{successMessage}</p>}

            {mode === 'register' && (
              <Input
                label="Anzeigename"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ihr Name"
                required
              />
            )}
            <Input
              label="E-Mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
            {(mode === 'login' || mode === 'register') && (
              <Input
                label="Passwort"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
              />
            )}
            {mode === 'register' && (
              <Input
                label="Passwort bestätigen"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="********"
                required
              />
            )}
            <Button type="submit" className="w-full" isLoading={isLoading}>
              {mode === 'login' ? 'Login' : mode === 'register' ? 'Registrieren' : 'Passwort zurücksetzen'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {mode === 'login' && (
              <>
                <Button variant="link" onClick={() => setMode('register')}>
                  Noch kein Konto? Registrieren
                </Button>
                <br />
                <Button variant="link" onClick={() => setMode('forgot-password')}>
                  Passwort vergessen?
                </Button>
              </>
            )}
            {mode === 'register' && (
              <Button variant="link" onClick={() => setMode('login')}>
                Bereits ein Konto? Login
              </Button>
            )}
            {mode === 'forgot-password' && (
              <Button variant="link" onClick={() => setMode('login')}>
                Zurück zum Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;