
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
        alert('Registrierung erfolgreich! Bitte melde dich jetzt an.');
        setIsLogin(true);
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
    } catch (err: any) {
      console.error('Google Auth error:', err);
      // Spezieller Hinweis für den 403 Fehler von Google
      if (err.message?.includes('403') || err.status === 403) {
        setError('Google verweigert den Zugriff (403). Bitte prüfen Sie, ob Ihre E-Mail als Test-Nutzer in der Google Cloud Console hinterlegt ist.');
      } else {
        setError(err.message || 'Google Anmeldung fehlgeschlagen.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading || user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 min-h-screen">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-indigo-600 tracking-tighter mb-2">TeamWallet</h1>
          <p className="text-slate-500 font-medium">
            {isLogin ? 'Anmeldung' : 'Konto erstellen'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-bold text-xs border border-red-100 leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label htmlFor="fullName" className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">
                Name
              </label>
              <input
                type="text"
                id="fullName"
                className="w-full bg-slate-50 border-none p-4 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={!isLogin}
                disabled={loading}
                placeholder="Ihr Name"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">
              E-Mail
            </label>
            <input
              type="email"
              id="email"
              className="w-full bg-slate-50 border-none p-4 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="name@mail.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">
              Passwort
            </label>
            <input
              type="password"
              id="password"
              className="w-full bg-slate-50 border-none p-4 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-100 transition duration-200 disabled:opacity-50 active:scale-95"
            disabled={loading}
          >
            {loading ? <LoadingSpinner /> : (isLogin ? 'Einloggen' : 'Registrieren')}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-4 text-slate-400 font-bold tracking-widest">Oder</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-4 rounded-xl flex items-center justify-center transition duration-200 active:scale-95"
          disabled={loading}
        >
          <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
            <path d="M22.47 12.01c0-.66-.06-1.3-.17-1.93h-10.7v3.62h6.05c-.26 1.45-1.05 2.68-2.22 3.55l.01.01 3.01 2.33c1.76-1.63 2.78-4.04 2.78-6.66z" fill="#4285F4"/>
            <path d="M11.59 22.5c2.92 0 5.37-1.02 7.15-2.77l-3.01-2.33c-.83.56-1.92.9-3.41.9-2.63 0-4.85-1.78-5.65-4.17H2.88v2.37c1.74 3.44 5.36 5.8 9.01 5.8z" fill="#34A853"/>
            <path d="M5.94 13.5c-.22-.66-.35-1.36-.35-2.06s.13-1.4.35-2.06V7.07H2.88c-.62 1.25-.97 2.65-.97 4.09s.35 2.84.97 4.09l3.06-2.37z" fill="#FBBC04"/>
            <path d="M11.59 3.49c1.59 0 2.99.55 4.09 1.57l2.64-2.64c-1.66-1.66-3.87-2.64-6.73-2.64-3.65 0-7.27 2.36-9.01 5.8l3.06 2.37c.8-2.39 3.02-4.17 5.65-4.17z" fill="#EA4335"/>
          </svg>
          Google Login
        </button>

        <p className="mt-8 text-center text-slate-500 font-medium text-sm">
          {isLogin ? 'Noch kein Account?' : 'Bereits Mitglied?'}{' '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-indigo-600 hover:text-indigo-800 font-bold ml-1 underline underline-offset-4"
            disabled={loading}
          >
            {isLogin ? 'Registrieren' : 'Einloggen'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
