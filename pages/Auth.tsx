
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { user, signInWithEmail, signUpWithEmail, signInWithGoogle, sessionLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !sessionLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate, sessionLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, fullName);
        alert('Registrierung erfolgreich! Bitte melden Sie sich jetzt an.');
        setIsLogin(true); // Switch to login after successful signup
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Ein Fehler ist aufgetreten.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // Google sign-in redirects automatically, useEffect will handle navigation
    } catch (err: any) {
      console.error('Google Auth error:', err);
      setError(err.message || 'Google Anmeldung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading || user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 min-h-screen">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          {isLogin ? 'Anmelden' : 'Registrieren'}
        </h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label htmlFor="fullName" className="block text-gray-700 text-sm font-bold mb-2">
                Vollständiger Name
              </label>
              <input
                type="text"
                id="fullName"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={!isLogin}
                disabled={loading}
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
              E-Mail
            </label>
            <input
              type="email"
              id="email"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
              Passwort
            </label>
            <input
              type="password"
              id="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
            disabled={loading}
          >
            {loading ? <LoadingSpinner /> : (isLogin ? 'Anmelden' : 'Registrieren')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={handleGoogleSignIn}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center justify-center disabled:opacity-50"
            disabled={loading}
          >
            {loading ? <LoadingSpinner /> : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.47 12.01c0-.66-.06-1.3-.17-1.93h-10.7v3.62h6.05c-.26 1.45-1.05 2.68-2.22 3.55l.01.01 3.01 2.33c1.76-1.63 2.78-4.04 2.78-6.66z" fill="#4285F4"/>
                  <path d="M11.59 22.5c2.92 0 5.37-1.02 7.15-2.77l-3.01-2.33c-.83.56-1.92.9-3.41.9-2.63 0-4.85-1.78-5.65-4.17H2.88v2.37c1.74 3.44 5.36 5.8 9.01 5.8z" fill="#34A853"/>
                  <path d="M5.94 13.5c-.22-.66-.35-1.36-.35-2.06s.13-1.4.35-2.06V7.07H2.88c-.62 1.25-.97 2.65-.97 4.09s.35 2.84.97 4.09l3.06-2.37z" fill="#FBBC04"/>
                  <path d="M11.59 3.49c1.59 0 2.99.55 4.09 1.57l2.64-2.64c-1.66-1.66-3.87-2.64-6.73-2.64-3.65 0-7.27 2.36-9.01 5.8l3.06 2.37c.8-2.39 3.02-4.17 5.65-4.17z" fill="#EA4335"/>
                </svg>
                Mit Google {isLogin ? 'anmelden' : 'registrieren'}
              </>
            )}
          </button>
        </div>

        <p className="mt-8 text-center text-gray-600">
          {isLogin ? 'Noch kein Konto?' : 'Bereits registriert?'}{' '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-indigo-600 hover:text-indigo-800 font-bold"
            disabled={loading}
          >
            {isLogin ? 'Jetzt registrieren' : 'Jetzt anmelden'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
